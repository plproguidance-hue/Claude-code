import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { QUOTATION_STATUS } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";
import { QuoteBuilderControls } from "./quote-controls";

export const metadata: Metadata = { title: "Quotation (admin)" };

export default async function AdminQuotationDetailPage({
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
  const total = (items ?? []).reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unit_price_cents),
    0,
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
            Created {formatDateUS(quotation.created_at)} · version{" "}
            {quotation.current_version}
            {quotation.request_note && ` · client note: ${quotation.request_note}`}
          </p>
        </div>
        <Badge tone={status?.tone ?? "neutral"}>
          {status?.label ?? quotation.status}
        </Badge>
      </div>

      {(items ?? []).length > 0 && (
        <Card>
          <CardTitle>
            Current version ({quotation.current_version}) —{" "}
            <span className="tnum">{formatUsd(total)}</span>
          </CardTitle>
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
          </ul>
        </Card>
      )}

      <QuoteBuilderControls
        quoteId={quotation.id}
        status={quotation.status}
      />
    </div>
  );
}
