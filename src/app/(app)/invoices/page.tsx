import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { INVOICE_STATUS } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const supabase = await createClient();
  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Invoices</h1>
        <p className="mt-1 text-sm text-ink-muted">
          USD invoices from {""}
          ProGuidance. Open an invoice to view line items, print it, or
          submit payment proof.
        </p>
      </div>

      {invoices && invoices.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Invoices</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Invoice</th>
                <th className="px-4 py-3 font-medium">Issued</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
                <th className="px-4 py-3 text-right font-medium">Balance</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const status = INVOICE_STATUS[invoice.status];
                return (
                  <tr
                    key={invoice.id}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/invoices/${invoice.id}`}
                        className="font-medium text-primary hover:text-primary-hover tnum"
                      >
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-ink-muted tnum">
                      {formatDateUS(invoice.issue_date)}
                    </td>
                    <td className="px-4 py-3 text-ink-muted tnum">
                      {formatDateUS(invoice.due_date)}
                    </td>
                    <td className="px-4 py-3 text-right text-ink tnum">
                      {formatUsd(invoice.total_cents)}
                    </td>
                    <td className="px-4 py-3 text-right text-ink tnum">
                      {formatUsd(
                        Math.max(
                          invoice.total_cents - invoice.amount_paid_cents,
                          0,
                        ),
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={status?.tone ?? "neutral"}>
                        {status?.label ?? invoice.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No invoices yet</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Invoices appear here once our team issues them — typically after
            an accepted quotation or ordered service.
          </p>
        </Card>
      )}
    </div>
  );
}
