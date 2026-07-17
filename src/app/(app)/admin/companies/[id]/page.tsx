import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { CompanyStatusBadge } from "@/components/ui/badge";
import {
  ENTITY_TYPE_LABELS,
  formatDateUS,
  maskEin,
} from "@/lib/format";
import { jurisdictionName } from "@/config/us-states";
import {
  AddDeadlineForm,
  ReviewRequestCard,
  StatusControls,
} from "./admin-company-controls";

export const metadata: Metadata = { title: "Company (admin)" };

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();

  const [
    { data: canReview },
    { data: owners },
    { data: requests },
    { data: deadlines },
  ] = await Promise.all([
    supabase.rpc("has_permission", { perm: "companies.update_request_review" }),
    supabase
      .from("company_owners_members")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at"),
    supabase
      .from("company_update_requests")
      .select("*")
      .eq("company_id", company.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("company_compliance_deadlines")
      .select("*")
      .eq("company_id", company.id)
      .order("due_date"),
  ]);

  const pending = (requests ?? []).filter(
    (request) => request.status === "pending",
  );
  const decided = (requests ?? []).filter(
    (request) => request.status !== "pending",
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {company.legal_name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {company.entity_type
              ? ENTITY_TYPE_LABELS[company.entity_type]
              : "Entity pending"}
            {company.formation_state
              ? ` · ${jurisdictionName(company.formation_state)}`
              : ""}
            {" · EIN "}
            <span className="tnum">{maskEin(company.ein)}</span>
          </p>
        </div>
        <CompanyStatusBadge status={company.status} />
      </div>

      {Boolean(canReview) && (
        <StatusControls companyId={company.id} status={company.status} />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Formation data</CardTitle>
          <dl className="mt-3 space-y-2 text-sm">
            {(
              [
                ["DBA", company.dba ?? "—"],
                ["Formation date", formatDateUS(company.formation_date)],
                ["Registered agent", company.registered_agent_name ?? "—"],
                ["Purpose", company.business_purpose ?? "—"],
                ["Submitted", formatDateUS(company.submitted_at)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="flex justify-between gap-3">
                <dt className="shrink-0 text-ink-muted">{label}</dt>
                <dd className="text-right text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <CardTitle>Owners</CardTitle>
          {owners && owners.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {owners.map((owner) => (
                <li key={owner.id} className="flex justify-between gap-3">
                  <span className="text-ink">
                    {owner.full_name}
                    {owner.role_title ? ` — ${owner.role_title}` : ""}
                  </span>
                  <span className="text-ink-muted tnum">
                    {owner.ownership_percent != null
                      ? `${owner.ownership_percent}%`
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">No owners on file.</p>
          )}
        </Card>
      </div>

      <section aria-labelledby="requests-heading" className="space-y-4">
        <h2 id="requests-heading" className="text-base font-semibold text-ink">
          Update requests {pending.length > 0 && `(${pending.length} pending)`}
        </h2>
        {pending.length > 0 ? (
          pending.map((request) => (
            <ReviewRequestCard
              key={request.id}
              request={request}
              canReview={Boolean(canReview)}
            />
          ))
        ) : (
          <Card>
            <p className="text-sm text-ink-muted">No pending update requests.</p>
          </Card>
        )}
        {decided.length > 0 && (
          <Card>
            <CardTitle>Decided requests</CardTitle>
            <ul className="mt-3 divide-y divide-line text-sm">
              {decided.map((request) => (
                <li key={request.id} className="py-2.5">
                  <div className="flex justify-between gap-3">
                    <span className="font-medium capitalize text-ink">
                      {request.status}
                    </span>
                    <span className="text-xs text-ink-muted tnum">
                      {formatDateUS(request.reviewed_at)}
                    </span>
                  </div>
                  {request.review_note && (
                    <p className="mt-1 text-xs text-ink-muted">
                      {request.review_note}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section aria-labelledby="deadlines-heading" className="space-y-4">
        <h2 id="deadlines-heading" className="text-base font-semibold text-ink">
          Compliance deadlines
        </h2>
        <Card>
          {deadlines && deadlines.length > 0 ? (
            <ul className="divide-y divide-line text-sm">
              {deadlines.map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex justify-between gap-3 py-2.5"
                >
                  <span className="text-ink">{deadline.title}</span>
                  <span className="text-ink-muted tnum">
                    {formatDateUS(deadline.due_date)} · {deadline.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-muted">No deadlines recorded.</p>
          )}
        </Card>
        {Boolean(canReview) && <AddDeadlineForm companyId={company.id} />}
      </section>
    </div>
  );
}
