import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { ReviewDocumentCard } from "./review-cards";

export const metadata: Metadata = { title: "Document review" };

export default async function DocumentReviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: canReview },
    { data: documents },
    { data: versions },
    { data: organizations },
  ] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.rpc("has_permission", { perm: "documents.review" }),
    supabase
      .from("documents")
      .select("*")
      .in("review_status", ["quarantined", "pending_review"])
      .order("created_at", { ascending: true }),
    supabase
      .from("document_versions")
      .select("*")
      .order("version", { ascending: false }),
    supabase.from("organizations").select("id, name"),
  ]);

  const isAdministrator = profile?.role === "administrator";
  const orgName = new Map(
    (organizations ?? []).map((organization) => [
      organization.id,
      organization.name,
    ]),
  );
  const quarantined = (documents ?? []).filter(
    (document) => document.review_status === "quarantined",
  );
  const pending = (documents ?? []).filter(
    (document) => document.review_status === "pending_review",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Document review & quarantine
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Unscanned or flagged files stay in quarantine until an
          administrator releases or rejects them; clean files wait here for a
          standard review. Rejections always carry a reason.
        </p>
      </div>

      <section aria-labelledby="quarantine-heading" className="space-y-4">
        <h2
          id="quarantine-heading"
          className="text-base font-semibold text-ink"
        >
          Quarantine ({quarantined.length})
        </h2>
        {quarantined.length > 0 ? (
          quarantined.map((document) => (
            <ReviewDocumentCard
              key={document.id}
              document={document}
              organizationName={
                orgName.get(document.organization_id) ?? "Organization"
              }
              versions={(versions ?? []).filter(
                (version) => version.document_id === document.id,
              )}
              mode="quarantine"
              canAct={isAdministrator}
            />
          ))
        ) : (
          <Card>
            <p className="text-sm text-ink-muted">Quarantine is empty.</p>
          </Card>
        )}
        {!isAdministrator && quarantined.length > 0 && (
          <p className="text-xs text-ink-muted">
            Quarantine decisions are limited to administrators.
          </p>
        )}
      </section>

      <section aria-labelledby="review-heading" className="space-y-4">
        <h2 id="review-heading" className="text-base font-semibold text-ink">
          Awaiting review ({pending.length})
        </h2>
        {pending.length > 0 ? (
          pending.map((document) => (
            <ReviewDocumentCard
              key={document.id}
              document={document}
              organizationName={
                orgName.get(document.organization_id) ?? "Organization"
              }
              versions={(versions ?? []).filter(
                (version) => version.document_id === document.id,
              )}
              mode="review"
              canAct={Boolean(canReview)}
            />
          ))
        ) : (
          <Card className="py-8 text-center">
            <ShieldCheck
              aria-hidden
              className="mx-auto h-8 w-8 text-ink-muted"
            />
            <CardTitle className="mt-3">Review queue is clear</CardTitle>
          </Card>
        )}
      </section>
    </div>
  );
}
