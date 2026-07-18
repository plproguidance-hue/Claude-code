import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { INVOICE_STATUS, lineTotalCents } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";
import { IssueInvoiceForm } from "./issue-form";

export const metadata: Metadata = { title: "Invoice (admin)" };

export default async function AdminInvoiceDetailPage({
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

  const [{ data: items }, { data: canIssue }] = await Promise.all([
    supabase
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", invoice.id)
      .order("sort"),
    supabase.rpc("has_permission", { perm: "invoices.issue" }),
  ]);

  const status = INVOICE_STATUS[invoice.status];
  const draftTotal = lineTotalCents(items ?? []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary tnum">
            {invoice.invoice_number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            Invoice{" "}
            <span className="tnum">
              {formatUsd(invoice.status === "draft" ? draftTotal : invoice.total_cents)}
            </span>
          </h1>
          <p className="mt-1 text-sm text-ink-muted tnum">
            Created {formatDateUS(invoice.created_at)}
            {invoice.issue_date && ` · issued ${formatDateUS(invoice.issue_date)}`}
            {invoice.due_date && ` · due ${formatDateUS(invoice.due_date)}`}
            {" · paid "}
            {formatUsd(invoice.amount_paid_cents)}
          </p>
        </div>
        <Badge tone={status?.tone ?? "neutral"}>
          {status?.label ?? invoice.status}
        </Badge>
      </div>

      <Card>
        <CardTitle>Line items</CardTitle>
        <ul className="mt-3 divide-y divide-line text-sm">
          {(items ?? []).map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2">
              <span className="text-ink">
                {item.label} × <span className="tnum">{item.quantity}</span>
              </span>
              <span className="text-ink tnum">
                {formatUsd(Math.round(item.quantity * item.unit_price_cents))}
              </span>
            </li>
          ))}
          {(items ?? []).length === 0 && (
            <li className="py-3 text-ink-muted">No line items yet.</li>
          )}
        </ul>
        {invoice.status !== "draft" && (
          <p className="mt-3 text-xs text-ink-muted">
            This invoice is issued and immutable; corrections use a credit
            note / revision workflow.
          </p>
        )}
      </Card>

      {invoice.status === "draft" && Boolean(canIssue) && (
        <IssueInvoiceForm invoiceId={invoice.id} />
      )}
      {invoice.status === "draft" && !canIssue && (
        <Card className="border-warning/50 bg-warning/5">
          <p className="text-sm text-ink">
            Issuing requires the <code className="text-xs">invoices.issue</code>{" "}
            permission (administrators).
          </p>
        </Card>
      )}
    </div>
  );
}
