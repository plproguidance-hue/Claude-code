import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { INVOICE_STATUS } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";
import { NewInvoiceForm } from "./new-invoice-form";

export const metadata: Metadata = { title: "Invoices (admin)" };

export default async function AdminInvoicesPage() {
  const supabase = await createClient();
  const [{ data: canCreate }, { data: invoices }, { data: organizations }] =
    await Promise.all([
      supabase.rpc("has_permission", { perm: "invoices.create" }),
      supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("organizations").select("id, name").order("name"),
    ]);

  const orgName = new Map(
    (organizations ?? []).map((organization) => [
      organization.id,
      organization.name,
    ]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Draft invoices are editable; issued invoices are immutable
          snapshots. Issuing requires the invoices.issue permission.
        </p>
      </div>

      {Boolean(canCreate) && (
        <NewInvoiceForm organizations={organizations ?? []} />
      )}

      <Card className="p-0">
        <ul className="divide-y divide-line">
          {(invoices ?? []).map((invoice) => {
            const status = INVOICE_STATUS[invoice.status];
            return (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/invoices/${invoice.id}`}
                    className="font-medium text-primary hover:text-primary-hover tnum"
                  >
                    {invoice.invoice_number}
                  </Link>
                  <p className="text-xs text-ink-muted tnum">
                    {orgName.get(invoice.organization_id) ?? "—"} ·{" "}
                    {formatDateUS(invoice.created_at)} ·{" "}
                    {formatUsd(invoice.total_cents)}
                  </p>
                </div>
                <Badge tone={status?.tone ?? "neutral"}>
                  {status?.label ?? invoice.status}
                </Badge>
              </li>
            );
          })}
          {(invoices ?? []).length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-ink-muted">
              No invoices in your scope yet.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
