import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import {
  AccountStatusBadge,
  CompanyStatusBadge,
  RoleBadge,
} from "@/components/ui/badge";
import { formatDateUS } from "@/lib/format";

export const metadata: Metadata = { title: "Client profile" };

export default async function AdminClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("*")
    .eq("user_id", profile.id);
  const orgIds = (memberships ?? []).map(
    (membership) => membership.organization_id,
  );

  const [{ data: organizations }, { data: companies }] = await Promise.all([
    orgIds.length > 0
      ? supabase.from("organizations").select("id, name, slug").in("id", orgIds)
      : Promise.resolve({ data: [] as { id: string; name: string; slug: string }[] }),
    orgIds.length > 0
      ? supabase
          .from("companies")
          .select("*")
          .in("organization_id", orgIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            {profile.full_name ?? profile.email}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">{profile.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <RoleBadge role={profile.role} />
          <AccountStatusBadge status={profile.status} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardTitle>Account</CardTitle>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Registered</dt>
              <dd className="text-ink tnum">{formatDateUS(profile.created_at)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Decision</dt>
              <dd className="text-ink">
                {profile.decided_at
                  ? `${formatDateUS(profile.decided_at)}${
                      profile.decision_note ? ` — ${profile.decision_note}` : ""
                    }`
                  : "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Phone</dt>
              <dd className="text-ink">{profile.phone ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">Country</dt>
              <dd className="text-ink">{profile.country ?? "—"}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardTitle>Organizations</CardTitle>
          {(organizations ?? []).length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {(organizations ?? []).map((organization) => (
                <li
                  key={organization.id}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="text-ink">{organization.name}</span>
                  <span className="text-xs text-ink-muted">
                    {organization.slug}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">
              Not a member of any organization.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle>Companies</CardTitle>
        {(companies ?? []).length > 0 ? (
          <ul className="mt-3 divide-y divide-line">
            {(companies ?? []).map((company) => (
              <li
                key={company.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <Link
                  href={`/admin/companies/${company.id}`}
                  className="font-medium text-primary hover:text-primary-hover"
                >
                  {company.legal_name}
                </Link>
                <CompanyStatusBadge status={company.status} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">No companies on file.</p>
        )}
      </Card>
    </div>
  );
}
