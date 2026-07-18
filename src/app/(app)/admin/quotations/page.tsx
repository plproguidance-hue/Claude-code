import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { QUOTATION_STATUS } from "@/lib/billing/labels";
import { formatDateUS } from "@/lib/format";
import { NewQuotationForm } from "./new-quotation-form";

export const metadata: Metadata = { title: "Quotations (admin)" };

export default async function AdminQuotationsPage() {
  const supabase = await createClient();
  const [{ data: canCreate }, { data: quotations }, { data: organizations }] =
    await Promise.all([
      supabase.rpc("has_permission", { perm: "quotations.create" }),
      supabase
        .from("quotations")
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
        <h1 className="text-2xl font-semibold text-ink">Quotations</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Draft, send, and convert quotations. Conversion creates exactly one
          order and one draft invoice — issuing stays a separate step.
        </p>
      </div>

      {Boolean(canCreate) && (
        <NewQuotationForm organizations={organizations ?? []} />
      )}

      <Card className="p-0">
        <ul className="divide-y divide-line">
          {(quotations ?? []).map((quotation) => {
            const status = QUOTATION_STATUS[quotation.status];
            return (
              <li
                key={quotation.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="min-w-0">
                  <Link
                    href={`/admin/quotations/${quotation.id}`}
                    className="font-medium text-primary hover:text-primary-hover"
                  >
                    {quotation.title}
                  </Link>
                  <p className="text-xs text-ink-muted tnum">
                    {quotation.quote_number} ·{" "}
                    {orgName.get(quotation.organization_id) ?? "—"} ·{" "}
                    {formatDateUS(quotation.created_at)}
                  </p>
                </div>
                <Badge tone={status?.tone ?? "neutral"}>
                  {status?.label ?? quotation.status}
                </Badge>
              </li>
            );
          })}
          {(quotations ?? []).length === 0 && (
            <li className="px-5 py-10 text-center text-sm text-ink-muted">
              No quotations in your scope yet.
            </li>
          )}
        </ul>
      </Card>
    </div>
  );
}
