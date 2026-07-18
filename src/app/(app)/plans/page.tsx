import type { Metadata } from "next";
import { Check } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const supabase = await createClient();

  const [{ data: plans }, { data: items }] = await Promise.all([
    supabase
      .from("service_plans")
      .select("*")
      .eq("is_published", true)
      .order("sort"),
    supabase.from("service_plan_items").select("*").order("sort"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Plans & bundles</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Bundled service packages in USD. Government fees are always billed
          separately.
        </p>
      </div>

      {plans && plans.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex h-full flex-col">
              <CardTitle>{plan.name}</CardTitle>
              <p className="mt-1 text-2xl font-semibold text-ink tnum">
                {formatUsd(plan.price_cents)}
                {plan.billing_note && (
                  <span className="text-sm font-normal text-ink-muted">
                    {" "}
                    {plan.billing_note}
                  </span>
                )}
              </p>
              {plan.description && (
                <p className="mt-2 text-sm text-ink-muted">{plan.description}</p>
              )}
              <ul className="mt-4 flex-1 space-y-2 text-sm">
                {(items ?? [])
                  .filter((item) => item.plan_id === plan.id)
                  .map((item) => (
                    <li key={item.id} className="flex items-start gap-2">
                      <Check
                        aria-hidden
                        className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      />
                      <span className="text-ink">{item.label}</span>
                    </li>
                  ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No published plans yet</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            ProGuidance bundles are being finalized. Individual services are
            available in the catalogue, and our team can prepare a custom
            quotation for combined work.
          </p>
        </Card>
      )}
    </div>
  );
}
