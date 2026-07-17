import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2, PlusCircle } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { CompanyStatusBadge } from "@/components/ui/badge";
import {
  ENTITY_TYPE_LABELS,
  formatDateUS,
  maskEin,
} from "@/lib/format";
import { jurisdictionName } from "@/config/us-states";
import { StartCompanyForms } from "./start-company-forms";

export const metadata: Metadata = { title: "Companies" };

export default async function CompaniesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: companies }, { data: memberships }] = await Promise.all([
    supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("organization_memberships").select("*").eq("user_id", user.id),
  ]);

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .in(
      "id",
      (memberships ?? []).map((membership) => membership.organization_id),
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Companies</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Your US companies under ProGuidance management. Formation data is
            authoritative — after submission, changes go through a reviewed
            update request.
          </p>
        </div>
      </div>

      {(organizations ?? []).length > 0 ? (
        <StartCompanyForms organizations={organizations ?? []} />
      ) : (
        <Card className="border-warning/50 bg-warning/5">
          <p className="text-sm text-ink">
            Your account is not linked to a client organization yet, so company
            onboarding is unavailable. Contact our team to finish onboarding.
          </p>
        </Card>
      )}

      {companies && companies.length > 0 ? (
        <ul className="grid gap-4 lg:grid-cols-2">
          {companies.map((company) => (
            <li key={company.id}>
              <Card className="h-full">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-charcoal/10">
                      <Building2
                        aria-hidden
                        className="h-5 w-5 text-charcoal"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">
                        {company.legal_name}
                      </p>
                      {company.dba && (
                        <p className="truncate text-xs text-ink-muted">
                          DBA {company.dba}
                        </p>
                      )}
                    </div>
                  </div>
                  <CompanyStatusBadge status={company.status} />
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-ink-muted">Entity</dt>
                    <dd className="text-ink">
                      {company.entity_type
                        ? ENTITY_TYPE_LABELS[company.entity_type]
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">State</dt>
                    <dd className="text-ink">
                      {company.formation_state
                        ? jurisdictionName(company.formation_state)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">Formed</dt>
                    <dd className="text-ink tnum">
                      {formatDateUS(company.formation_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-ink-muted">EIN</dt>
                    <dd className="text-ink tnum">{maskEin(company.ein)}</dd>
                  </div>
                </dl>

                <div className="mt-4">
                  {company.status === "draft" ? (
                    <Link
                      href={`/companies/new?draft=${company.id}&step=${company.wizard_step}`}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      <PlusCircle aria-hidden className="h-4 w-4" />
                      Resume onboarding (step {company.wizard_step} of 6)
                    </Link>
                  ) : (
                    <Link
                      href={`/companies/${company.id}`}
                      className="text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      View company
                    </Link>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No companies yet</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Start a new US formation or transfer an existing company using the
            options above.
          </p>
        </Card>
      )}
    </div>
  );
}
