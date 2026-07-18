"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  safeFilename,
  validateUpload,
} from "@/lib/documents/validation";
import { getVirusScanner } from "@/lib/documents/virus-scan";
import {
  buildStoragePath,
  createSignedDownloadUrl,
  storageConfigured,
  uploadToPrivateStorage,
} from "@/lib/documents/storage";
import type { DocumentCategory } from "@/lib/database.types";

export type DocumentActionState = { error?: string; message?: string };

const CATEGORIES: readonly DocumentCategory[] = [
  "formation",
  "identity",
  "tax",
  "banking",
  "marketplace",
  "approval_letter",
  "certificate",
  "other",
];

/**
 * Upload pipeline: validate (size, allowlist, magic bytes) → store into the
 * default-deny private bucket via the service path → create RLS-checked
 * document + version rows (quarantined) → scan → clean scans promote to
 * pending_review, anything else stays quarantined for an administrator.
 */
export async function uploadDocument(
  _prev: DocumentActionState,
  formData: FormData,
): Promise<DocumentActionState> {
  const meta = z
    .object({
      title: z.string().trim().min(2, "Give the document a title.").max(200),
      category: z.enum(CATEGORIES as [DocumentCategory, ...DocumentCategory[]]),
      organizationId: z.string().uuid(),
      projectId: z
        .string()
        .optional()
        .transform((value) => (value ? value : null)),
      companyId: z
        .string()
        .optional()
        .transform((value) => (value ? value : null)),
    })
    .safeParse({
      title: formData.get("title"),
      category: formData.get("category"),
      organizationId: formData.get("organizationId"),
      projectId: formData.get("projectId") ?? undefined,
      companyId: formData.get("companyId") ?? undefined,
    });
  if (!meta.success) {
    return { error: meta.error.issues[0]?.message ?? "Check the details." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file to upload." };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const validation = validateUpload(bytes, file.type);
  if (!validation.ok) return { error: validation.reason };

  if (!storageConfigured()) {
    return {
      error:
        "Document storage is not configured on this deployment yet — no file was uploaded. The owner must set SUPABASE_SERVICE_ROLE_KEY and connect a Supabase project.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const documentId = randomUUID();
  const fileName = safeFilename(file.name);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const storagePath = buildStoragePath({
    organizationId: meta.data.organizationId,
    documentId,
    version: 1,
    fileName,
  });

  const stored = await uploadToPrivateStorage(
    storagePath,
    bytes,
    validation.mime,
  );
  if (!stored.ok) return { error: stored.reason };

  // Rows are created under the caller's own session: RLS enforces org
  // membership and the quarantine default.
  const { error: documentError } = await supabase.from("documents").insert({
    id: documentId,
    organization_id: meta.data.organizationId,
    project_id: meta.data.projectId,
    company_id: meta.data.companyId,
    title: meta.data.title,
    category: meta.data.category,
    uploaded_by: user.id,
  });
  if (documentError) {
    return {
      error:
        "The document record could not be created (are you a member of this organization?).",
    };
  }

  const { data: version, error: versionError } = await supabase
    .from("document_versions")
    .insert({
      document_id: documentId,
      version: 1,
      file_name: fileName,
      mime_type: validation.mime,
      size_bytes: bytes.length,
      checksum_sha256: checksum,
      storage_path: storagePath,
      uploaded_by: user.id,
    })
    .select("id")
    .single();
  if (versionError || !version) {
    return { error: "The file version could not be recorded." };
  }

  // Scan and record the result via the system context. 'unavailable' keeps
  // the hard quarantine — never auto-approved.
  const scanResult = await getVirusScanner().scan(bytes);
  const admin = createAdminClient();
  await admin.rpc("mark_document_scanned", {
    p_version: version.id,
    result: scanResult,
  });

  revalidatePath("/documents");
  return {
    message:
      scanResult === "clean"
        ? "Uploaded and scanned clean — now awaiting review by our team."
        : scanResult === "infected"
          ? "Upload stored but flagged by the virus scanner. It stays quarantined; our team has been alerted."
          : "Uploaded. Virus scanning is not available right now, so the file stays in quarantine until an administrator inspects it.",
  };
}

/**
 * Authorized download: the version must be visible to the caller under RLS
 * AND the document must be out of quarantine (administrators excepted).
 * Only then is a 60-second signed URL minted.
 */
export async function requestDownload(formData: FormData): Promise<void> {
  const parsed = z.string().uuid().safeParse(formData.get("versionId"));
  if (!parsed.success) redirect("/documents?download=invalid");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: version } = await supabase
    .from("document_versions")
    .select("*")
    .eq("id", parsed.data)
    .maybeSingle();
  if (!version) redirect("/documents?download=denied");

  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", version.document_id)
    .maybeSingle();
  if (!document) redirect("/documents?download=denied");

  if (document.review_status === "quarantined") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.role !== "administrator") {
      redirect("/documents?download=quarantined");
    }
  }

  const signed = await createSignedDownloadUrl(version.storage_path);
  if (!signed.ok) redirect("/documents?download=unconfigured");

  redirect(signed.url);
}
