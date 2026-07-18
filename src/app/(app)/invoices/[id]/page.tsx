import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { brand } from "@/config/brand";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { INVOICE_STATUS } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";
import { PayProofForm, PrintButton } from "./invoice-client";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) notFound();

  const [{ data: items }, { data: payments }] = await Promise.all([
    supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("sort"),
    supabase
      .from("payments")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("created_at", { ascending: false }),
  ]);

  const status = INVOICE_STATUS[invoice.status];
  const balance = Math.max(invoice.total_cents - invoice.amount_paid_cents, 0);
  const payable = ["sent", "viewed", "partially_paid", "overdue"].includes(
    invoice.status,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary tnum">
            {invoice.invoice_number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">Invoice</h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge tone={status?.tone ?? "neutral"}>
            {status?.label ?? invoice.status}
          </Badge>
          <PrintButton />
        </div>
      </div>

      <Card id="invoice-print-area">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-4">
          <div>
            <p className="text-lg font-bold text-ink">{brand.legalName}</p>
            <p className="text-xs text-ink-muted">
              {brand.address.line1}, {brand.address.city},{" "}
              {brand.address.state} {brand.address.postalCode},{" "}
              {brand.address.country}
            </p>
            <p className="text-xs text-ink-muted">{brand.publicEmail}</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-semibold text-ink tnum">
              {invoice.invoice_number}
            </p>
            <p className="text-ink-muted tnum">
              Issued {formatDateUS(invoice.issue_date)}
            </p>
            <p className="text-ink-muted tnum">
              Due {formatDateUS(invoice.due_date)}
            </p>
          </div>
        </div>

        <table className="mt-4 w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Qty</th>
              <th className="py-2 text-right font-medium">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            {(items ?? []).map((item) => (
              <tr key={item.id} className="border-b border-line last:border-b-0">
                <td className="py-2 text-ink">
                  {item.label}
                  {item.is_government_fee && (
                    <span className="ml-1 text-xs text-ink-muted">
                      (government / third-party fee)
                    </span>
                  )}
                </td>
                <td className="py-2 text-right text-ink tnum">
                  {item.quantity}
                </td>
                <td className="py-2 text-right text-ink tnum">
                  {formatUsd(Math.round(item.quantity * item.unit_price_cents))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="text-sm">
            <tr>
              <td colSpan={2} className="pt-3 text-right text-ink-muted">
                Total
              </td>
              <td className="pt-3 text-right font-semibold text-ink tnum">
                {formatUsd(invoice.total_cents)}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="py-1 text-right text-ink-muted">
                Paid
              </td>
              <td className="py-1 text-right text-ink tnum">
                {formatUsd(invoice.amount_paid_cents)}
              </td>
            </tr>
            <tr>
              <td colSpan={2} className="py-1 text-right font-semibold text-ink">
                Balance due
              </td>
              <td className="py-1 text-right text-lg font-bold text-ink tnum">
                {formatUsd(balance)}
              </td>
            </tr>
          </tfoot>
        </table>

        {(invoice.notes ?? invoice.terms) && (
          <p className="mt-4 border-t border-line pt-3 text-xs text-ink-muted">
            {invoice.notes} {invoice.terms}
          </p>
        )}
      </Card>

      {payable && balance > 0 && (
        <PayProofForm
          organizationId={invoice.organization_id}
          invoiceId={invoice.id}
          balanceCents={balance}
        />
      )}

      {(payments ?? []).length > 0 && (
        <Card className="print:hidden">
          <CardTitle>Payments on this invoice</CardTitle>
          <ul className="mt-3 divide-y divide-line text-sm">
            {(payments ?? []).map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="text-ink tnum">
                  {formatUsd(payment.amount_cents)}
                  {payment.reference && ` · ${payment.reference}`}
                </span>
                <span className="text-xs capitalize text-ink-muted">
                  {payment.status.replaceAll("_", " ")}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
