import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { QUOTATION_STATUS } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";
import { DecisionForm } from "./decision-form";

export const metadata: Metadata = { title: "Quotation" };

export default async function QuotationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quotation } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!quotation) notFound();

  const { data: versions } = await supabase
    .from("quotation_versions")
    .select("*")
    .eq("quotation_id", quotation.id)
    .order("version", { ascending: false });
  const current = (versions ?? []).find(
    (version) => version.version === quotation.current_version,
  );
  const { data: items } = current
    ? await supabase
        .from("quotation_line_items")
        .select("*")
        .eq("quotation_version_id", current.id)
        .order("sort")
    : { data: [] };

  const status = QUOTATION_STATUS[quotation.status];
  const professional = (items ?? []).filter((item) => !item.is_government_fee);
  const government = (items ?? []).filter((item) => item.is_government_fee);
  const total = (items ?? []).reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unit_price_cents),
    0,
  );
  const decidable = ["sent", "viewed", "changes_requested"].includes(
    quotation.status,
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary tnum">
            {quotation.quote_number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {quotation.title}
          </h1>
          <p className="mt-1 text-sm text-ink-muted tnum">
            Issued {formatDateUS(quotation.created_at)}
            {quotation.valid_until &&
              ` · valid until ${formatDateUS(quotation.valid_until)}`}
            {quotation.current_version > 0 &&
              ` · version ${quotation.current_version}`}
          </p>
        </div>
        <Badge tone={status?.tone ?? "neutral"}>
          {status?.label ?? quotation.status}
        </Badge>
      </div>

      {(items ?? []).length > 0 ? (
        <Card>
          <CardTitle>Line items</CardTitle>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 text-right font-medium">Qty</th>
                <th className="py-2 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody>
              {professional.map((item) => (
                <tr key={item.id} className="border-b border-line last:border-b-0">
                  <td className="py-2 text-ink">{item.label}</td>
                  <td className="py-2 text-right text-ink tnum">
                    {item.quantity}
                  </td>
                  <td className="py-2 text-right text-ink tnum">
                    {formatUsd(Math.round(item.quantity * item.unit_price_cents))}
                  </td>
                </tr>
              ))}
              {government.map((item) => (
                <tr key={item.id} className="border-b border-line last:border-b-0">
                  <td className="py-2 text-ink">
                    {item.label}{" "}
                    <span className="text-xs text-ink-muted">
                      (government / third-party fee)
                    </span>
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
            <tfoot>
              <tr>
                <td colSpan={2} className="py-3 text-right font-semibold text-ink">
                  Total (USD)
                </td>
                <td className="py-3 text-right text-lg font-semibold text-ink tnum">
                  {formatUsd(total)}
                </td>
              </tr>
            </tfoot>
          </table>
          {quotation.terms && (
            <p className="mt-2 text-xs text-ink-muted">
              Terms: {quotation.terms}
            </p>
          )}
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-ink-muted">
            Our team is preparing this quotation — line items appear here when
            it is sent.
          </p>
        </Card>
      )}

      {decidable && <DecisionForm quoteId={quotation.id} />}

      {quotation.decided_at && (
        <Card className="bg-page/60">
          <p className="text-sm text-ink">
            Decision recorded {formatDateUS(quotation.decided_at)}
            {quotation.decision_note && ` — "${quotation.decision_note}"`}
          </p>
        </Card>
      )}
    </div>
  );
}
