import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Alert } from "@/components/ui/alert";
import { Card, CardTitle } from "@/components/ui/card";
import { CompanyStatusBadge } from "@/components/ui/badge";
import {
  COMPANY_STATUS_LABELS,
  ENTITY_TYPE_LABELS,
  formatDateUS,
  maskEin,
} from "@/lib/format";
import { jurisdictionName } from "@/config/us-states";
import { cn } from "@/lib/utils";
import { RevealEin } from "./reveal-ein";
import { UpdateRequestForm } from "./update-request-form";

export const metadata: Metadata = { title: "Company" };

const TABS = [
  ["overview", "Overview"],
  ["formation", "Formation"],
  ["owners", "Owners"],
  ["addresses", "Addresses & agent"],
  ["tax", "EIN & tax"],
  ["compliance", "Compliance"],
  ["requests", "Update requests"],
] as const;

type TabKey = (typeof TABS)[number][0];

export default async function CompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const tab: TabKey = (TABS.map(([key]) => key) as string[]).includes(
    String(query.tab),
  )
    ? (query.tab as TabKey)
    : "overview";

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!company) notFound();
  if (company.status === "draft") {
    redirect(`/companies/new?draft=${company.id}&step=${company.wizard_step}`);
  }

  const [{ data: owners }, { data: addresses }, { data: deadlines }, { data: requests }] =
    await Promise.all([
      supabase
        .from("company_owners_members")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at"),
      supabase.from("company_addresses").select("*").eq("company_id", company.id),
      supabase
        .from("company_compliance_deadlines")
        .select("*")
        .eq("company_id", company.id)
        .order("due_date"),
      supabase
        .from("company_update_requests")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false }),
    ]);

  return (
    <div className="space-y-6">
      {query.submitted === "1" && (
        <Alert tone="success">
          Company submitted for review. Our team verifies the details and
          activates the record — you&apos;ll see the status change here.
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {company.legal_name}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {company.entity_type
              ? ENTITY_TYPE_LABELS[company.entity_type]
              : "Entity type pending"}
            {company.formation_state
              ? ` · ${jurisdictionName(company.formation_state)}`
              : ""}
          </p>
        </div>
        <CompanyStatusBadge status={company.status} />
      </div>

      <nav aria-label="Company sections" className="overflow-x-auto">
        <ul className="flex min-w-max gap-1 border-b border-line">
          {TABS.map(([key, label]) => (
            <li key={key}>
              <Link
                href={`/companies/${company.id}?tab=${key}`}
                aria-current={tab === key ? "page" : undefined}
                className={cn(
                  "inline-block border-b-2 px-3 py-2 text-sm font-medium",
                  tab === key
                    ? "border-primary text-primary"
                    : "border-transparent text-ink-muted hover:text-ink",
                )}
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>Status</CardTitle>
            <p className="mt-2 text-sm text-ink">
              {COMPANY_STATUS_LABELS[company.status]}
              {company.submitted_at
                ? ` · submitted ${formatDateUS(company.submitted_at)}`
                : ""}
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              {company.status === "pending_review"
                ? "ProGuidance is reviewing this company. You can still file update requests; approved changes are applied by our team."
                : "Authoritative filing data changes go through reviewed update requests — see the Update requests tab."}
            </p>
          </Card>
          <Card>
            <CardTitle>At a glance</CardTitle>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Formation date</dt>
                <dd className="text-ink tnum">
                  {formatDateUS(company.formation_date)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">EIN</dt>
                <dd className="text-ink tnum">{maskEin(company.ein)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Owners on file</dt>
                <dd className="text-ink tnum">{owners?.length ?? 0}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Upcoming deadlines</dt>
                <dd className="text-ink tnum">
                  {(deadlines ?? []).filter((d) => d.status === "upcoming").length}
                </dd>
              </div>
            </dl>
          </Card>
        </div>
      )}

      {tab === "formation" && (
        <Card>
          <CardTitle>Formation & filing data</CardTitle>
          <dl className="mt-4 divide-y divide-line">
            {(
              [
                ["Legal name", company.legal_name],
                ["DBA", company.dba ?? "—"],
                [
                  "Entity type",
                  company.entity_type
                    ? (ENTITY_TYPE_LABELS[company.entity_type] ?? "—")
                    : "—",
                ],
                [
                  "Formation state",
                  company.formation_state
                    ? jurisdictionName(company.formation_state)
                    : "—",
                ],
                ["Formation date", formatDateUS(company.formation_date)],
                ["Business purpose", company.business_purpose ?? "—"],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="grid grid-cols-3 gap-3 py-2.5 text-sm">
                <dt className="text-ink-muted">{label}</dt>
                <dd className="col-span-2 text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}

      {tab === "owners" && (
        <Card>
          <CardTitle>Owners, members & officers</CardTitle>
          {owners && owners.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {owners.map((owner) => (
                <li key={owner.id} className="py-3 text-sm">
                  <p className="font-medium text-ink">
                    {owner.full_name}
                    {owner.role_title ? ` — ${owner.role_title}` : ""}
                  </p>
                  <p className="text-ink-muted">
                    {owner.ownership_percent != null
                      ? `${owner.ownership_percent}% ownership`
                      : "Ownership not specified"}
                    {owner.country ? ` · resides in ${owner.country}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">No owners on file.</p>
          )}
        </Card>
      )}

      {tab === "addresses" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(addresses ?? []).map((address) => (
            <Card key={address.id}>
              <CardTitle className="capitalize">
                {address.kind} address
              </CardTitle>
              <p className="mt-2 text-sm text-ink">
                {address.line1}
                {address.line2 ? <>, {address.line2}</> : null}
                <br />
                {address.city}, {address.state} {address.postal_code}
                <br />
                {address.country}
              </p>
            </Card>
          ))}
          <Card>
            <CardTitle>Registered agent</CardTitle>
            <p className="mt-2 text-sm text-ink">
              {company.registered_agent_name ?? "—"}
            </p>
          </Card>
        </div>
      )}

      {tab === "tax" && (
        <Card className="max-w-xl">
          <CardTitle>EIN & tax details</CardTitle>
          <p className="mt-2 text-sm text-ink-muted">
            The EIN is masked by default. Re-enter your password to reveal it
            once for this session.
          </p>
          <p className="mt-4 text-2xl font-semibold text-ink tnum">
            {maskEin(company.ein)}
          </p>
          {company.ein && <RevealEin companyId={company.id} />}
        </Card>
      )}

      {tab === "compliance" && (
        <Card>
          <CardTitle>Compliance calendar</CardTitle>
          {deadlines && deadlines.length > 0 ? (
            <ul className="mt-4 divide-y divide-line">
              {deadlines.map((deadline) => (
                <li
                  key={deadline.id}
                  className="flex items-center justify-between gap-3 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-ink">{deadline.title}</p>
                    {deadline.notes && (
                      <p className="text-ink-muted">{deadline.notes}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-ink tnum">
                      {formatDateUS(deadline.due_date)}
                    </p>
                    <p className="text-xs capitalize text-ink-muted">
                      {deadline.status}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              No deadlines recorded yet. ProGuidance adds annual report, agent
              renewal, and tax deadlines as part of compliance management.
            </p>
          )}
        </Card>
      )}

      {tab === "requests" && (
        <div className="space-y-4">
          <UpdateRequestForm companyId={company.id} />
          <Card>
            <CardTitle>Request history</CardTitle>
            {requests && requests.length > 0 ? (
              <ul className="mt-4 divide-y divide-line">
                {requests.map((request) => (
                  <li key={request.id} className="py-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium capitalize text-ink">
                        {request.status}
                      </p>
                      <p className="text-xs text-ink-muted tnum">
                        {formatDateUS(request.created_at)}
                      </p>
                    </div>
                    <p className="mt-1 text-ink-muted">
                      {Object.entries(request.changes)
                        .map(
                          ([field, value]) =>
                            `${field.replaceAll("_", " ")} → ${
                              field === "ein" ? maskEin(value) : value
                            }`,
                        )
                        .join("; ")}
                    </p>
                    {request.review_note && (
                      <p className="mt-1 text-xs text-ink-muted">
                        Reviewer note: {request.review_note}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-muted">
                No update requests yet.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
