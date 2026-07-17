import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { CompanyStatusBadge } from "@/components/ui/badge";
import { ENTITY_TYPE_LABELS, formatDateUS, maskEin } from "@/lib/format";

export const metadata: Metadata = { title: "Companies (admin)" };

export default async function AdminCompaniesPage() {
  const supabase = await createClient();

  const [{ data: companies }, { data: pendingRequests }] = await Promise.all([
    supabase
      .from("companies")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase
      .from("company_update_requests")
      .select("id, company_id")
      .eq("status", "pending"),
  ]);

  const pendingByCompany = new Map<string, number>();
  for (const request of pendingRequests ?? []) {
    pendingByCompany.set(
      request.company_id,
      (pendingByCompany.get(request.company_id) ?? 0) + 1,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Companies</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Company records within your scope. Pending-review companies and open
          update requests need staff action.
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-left text-sm">
          <caption className="sr-only">Company directory</caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">Company</th>
              <th scope="col" className="px-4 py-3 font-medium">Entity</th>
              <th scope="col" className="px-4 py-3 font-medium">EIN</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Requests</th>
              <th scope="col" className="px-4 py-3 font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {(companies ?? []).map((company) => (
              <tr key={company.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/companies/${company.id}`}
                    className="font-medium text-primary hover:text-primary-hover"
                  >
                    {company.legal_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {company.entity_type
                    ? ENTITY_TYPE_LABELS[company.entity_type]
                    : "—"}
                  {company.formation_state ? ` · ${company.formation_state}` : ""}
                </td>
                <td className="px-4 py-3 text-ink-muted tnum">
                  {maskEin(company.ein)}
                </td>
                <td className="px-4 py-3">
                  <CompanyStatusBadge status={company.status} />
                </td>
                <td className="px-4 py-3 tnum">
                  {pendingByCompany.get(company.id) ?? 0}
                </td>
                <td className="px-4 py-3 text-ink-muted tnum">
                  {formatDateUS(company.created_at)}
                </td>
              </tr>
            ))}
            {(!companies || companies.length === 0) && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-ink-muted">
                  No companies visible in your permission scope.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
