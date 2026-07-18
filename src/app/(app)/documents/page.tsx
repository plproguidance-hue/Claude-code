import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Download, FileText } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import type { DocumentVersionRow } from "@/lib/database.types";
import { Alert } from "@/components/ui/alert";
import { Card, CardTitle } from "@/components/ui/card";
import { DocumentStatusBadge } from "@/components/ui/badge";
import { formatDateUS } from "@/lib/format";
import { cn } from "@/lib/utils";
import { requestDownload } from "./actions";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Document vault" };

const TABS = [
  ["all", "All"],
  ["required", "Required"],
  ["pending", "Uploaded / in review"],
  ["approved", "Approved"],
  ["rejected", "Rejected"],
  ["letters", "Letters & certificates"],
  ["expiring", "Expiring"],
] as const;

type TabKey = (typeof TABS)[number][0];

const DOWNLOAD_MESSAGES: Record<string, string> = {
  quarantined:
    "That file is still in quarantine and cannot be downloaded yet.",
  denied: "You are not authorized to download that file.",
  unconfigured:
    "Downloads are unavailable until document storage is configured for this deployment.",
  invalid: "Invalid download request.",
};

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const tab: TabKey = (TABS.map(([key]) => key) as string[]).includes(
    String(query.tab),
  )
    ? (query.tab as TabKey)
    : "all";
  const downloadNotice =
    typeof query.download === "string"
      ? DOWNLOAD_MESSAGES[query.download]
      : undefined;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: documents },
    { data: versions },
    { data: openDocumentRequests },
    { data: memberships },
    { data: projects },
    { data: services },
  ] = await Promise.all([
    supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("document_versions")
      .select("*")
      .order("version", { ascending: false }),
    supabase
      .from("data_requests")
      .select("*")
      .eq("kind", "document")
      .in("status", ["sent", "viewed", "in_progress", "rejected_changes_required"]),
    supabase.from("organization_memberships").select("*").eq("user_id", user.id),
    supabase
      .from("projects")
      .select("id, order_number, organization_id, service_id")
      .not("status", "in", "(completed,cancelled)"),
    supabase.from("services").select("id, name"),
  ]);

  const orgIds = (memberships ?? []).map((m) => m.organization_id);
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"]);

  const serviceName = new Map(
    (services ?? []).map((service) => [service.id, service.name]),
  );

  const soon = new Date();
  soon.setDate(soon.getDate() + 45);
  const filtered = (documents ?? []).filter((document) => {
    switch (tab) {
      case "pending":
        return ["quarantined", "pending_review"].includes(
          document.review_status,
        );
      case "approved":
        return document.review_status === "approved";
      case "rejected":
        return document.review_status === "rejected";
      case "letters":
        return ["approval_letter", "certificate"].includes(document.category);
      case "expiring":
        return (
          document.expires_at !== null &&
          new Date(document.expires_at) <= soon
        );
      default:
        return true;
    }
  });

  const latestVersion = new Map<string, DocumentVersionRow>();
  for (const version of versions ?? []) {
    if (!latestVersion.has(version.document_id)) {
      latestVersion.set(version.document_id, version);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Document vault</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Private, scanned, and reviewed business documents. Downloads are
          authorized on every request with short-lived links — there are no
          public file URLs.
        </p>
      </div>

      {downloadNotice && <Alert tone="error">{downloadNotice}</Alert>}

      {(organizations ?? []).length > 0 && (
        <UploadForm
          organizations={organizations ?? []}
          projects={(projects ?? []).map((project) => ({
            id: project.id,
            organizationId: project.organization_id,
            label: `${project.order_number} — ${
              serviceName.get(project.service_id) ?? "Service"
            }`,
          }))}
        />
      )}

      <nav aria-label="Vault filters" className="overflow-x-auto">
        <ul className="flex min-w-max gap-1.5">
          {TABS.map(([key, label]) => (
            <li key={key}>
              <Link
                href={`/documents?tab=${key}`}
                className={cn(
                  "inline-block rounded-full px-3 py-1.5 text-xs font-medium",
                  tab === key
                    ? "bg-primary text-white"
                    : "border border-line text-ink-muted hover:text-ink",
                )}
              >
                {label}
                {key === "required" &&
                  (openDocumentRequests ?? []).length > 0 && (
                    <span className="ml-1.5 tnum">
                      {(openDocumentRequests ?? []).length}
                    </span>
                  )}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "required" ? (
        (openDocumentRequests ?? []).length > 0 ? (
          <ul className="space-y-3">
            {(openDocumentRequests ?? []).map((request) => (
              <li key={request.id}>
                <Card className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{request.title}</p>
                    <p className="text-xs text-ink-muted">
                      {request.due_date && (
                        <span className="tnum">
                          Due {formatDateUS(request.due_date)} ·{" "}
                        </span>
                      )}
                      Upload the file above, then respond on the request so
                      our team can review it.
                    </p>
                  </div>
                  <Link
                    href="/requests"
                    className="text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    Open request
                  </Link>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="py-10 text-center">
            <CardTitle>Nothing required right now</CardTitle>
            <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
              Document requests from our team appear here with due dates.
            </p>
          </Card>
        )
      ) : filtered.length > 0 ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {filtered.map((document) => {
            const version = latestVersion.get(document.id);
            const downloadable =
              document.review_status !== "quarantined" && version;
            return (
              <li key={document.id}>
                <Card className="h-full">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-charcoal/10">
                        <FileText
                          aria-hidden
                          className="h-5 w-5 text-charcoal"
                        />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink">
                          {document.title}
                        </p>
                        <p className="truncate text-xs text-ink-muted">
                          {version
                            ? `${version.file_name} · v${document.current_version}`
                            : "No file yet"}
                          {" · "}
                          <span className="capitalize">
                            {document.category.replaceAll("_", " ")}
                          </span>
                        </p>
                      </div>
                    </div>
                    <DocumentStatusBadge status={document.review_status} />
                  </div>

                  {document.review_status === "rejected" &&
                    document.review_note && (
                      <Alert tone="error" className="mt-3">
                        Reviewer: {document.review_note}
                      </Alert>
                    )}
                  {document.review_status === "quarantined" && (
                    <p className="mt-3 text-xs text-ink-muted">
                      Awaiting virus scan / administrator inspection. Not
                      downloadable until released.
                    </p>
                  )}

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-ink-muted tnum">
                      Uploaded {formatDateUS(document.created_at)}
                      {document.expires_at &&
                        ` · expires ${formatDateUS(document.expires_at)}`}
                    </p>
                    {downloadable && (
                      <form action={requestDownload}>
                        <input
                          type="hidden"
                          name="versionId"
                          value={version.id}
                        />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                        >
                          <Download aria-hidden className="h-4 w-4" />
                          Download
                        </button>
                      </form>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No documents here</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Documents you upload — and approvals, letters, and certificates
            our team issues — appear in this vault.
          </p>
        </Card>
      )}
    </div>
  );
}
