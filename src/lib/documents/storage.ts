import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env";

export const DOCUMENTS_BUCKET = "documents";

/** Signed URLs live for 60 seconds — authorization happens on every request. */
export const SIGNED_URL_TTL_SECONDS = 60;

export function storageConfigured(): boolean {
  return Boolean(serverEnv().SUPABASE_SERVICE_ROLE_KEY);
}

export function buildStoragePath(input: {
  organizationId: string;
  documentId: string;
  version: number;
  fileName: string;
}): string {
  return `org/${input.organizationId}/${input.documentId}/v${input.version}/${input.fileName}`;
}

/**
 * Uploads bytes into the private bucket via the service-role client. The
 * bucket has no storage policies (default deny), so this server path — which
 * runs only after table-level authorization — is the sole way in.
 */
export async function uploadToPrivateStorage(
  path: string,
  content: Uint8Array,
  contentType: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!storageConfigured()) {
    return {
      ok: false,
      reason:
        "Document storage is not configured on this deployment yet (missing service credentials).",
    };
  }
  const admin = createAdminClient();
  const { error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, content, { contentType, upsert: false });
  if (error) {
    return { ok: false, reason: "The file could not be stored. Try again." };
  }
  return { ok: true };
}

/**
 * Issues a short-lived signed download URL. Callers MUST have already
 * authorized the requester against the document tables (RLS-visible version
 * row) — this helper only mints the URL.
 */
export async function createSignedDownloadUrl(
  path: string,
): Promise<{ ok: true; url: string } | { ok: false; reason: string }> {
  if (!storageConfigured()) {
    return {
      ok: false,
      reason:
        "Downloads are unavailable until document storage is configured for this deployment.",
    };
  }
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return { ok: false, reason: "Could not authorize the download." };
  }
  return { ok: true, url: data.signedUrl };
}
