import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import { CatalogueRowControls, PlanRowControls } from "./catalogue-controls";

export const metadata: Metadata = { title: "Catalogue" };

export default async function AdminCataloguePage() {
  const supabase = await createClient();

  const [
    { data: canManage },
    { data: categories },
    { data: services },
    { data: plans },
  ] = await Promise.all([
    supabase.rpc("has_permission", { perm: "services.manage" }),
    supabase.from("service_categories").select("*").order("sort"),
    supabase.from("services").select("*").order("sort"),
    supabase.from("service_plans").select("*").order("sort"),
  ]);

  const categoryName = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Service catalogue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Prices are data, never hardcoded in the UI. Seed prices from the
          previous portal stay flagged until an administrator verifies them.
          {!canManage &&
            " You can view the catalogue; changes require services.manage."}
        </p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[680px] text-left text-sm">
          <caption className="sr-only">Services</caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="px-4 py-3 font-medium">Service</th>
              <th scope="col" className="px-4 py-3 font-medium">Category</th>
              <th scope="col" className="px-4 py-3 font-medium">Price</th>
              <th scope="col" className="px-4 py-3 font-medium">State</th>
              {Boolean(canManage) && (
                <th scope="col" className="px-4 py-3 font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {(services ?? []).map((service) => (
              <tr key={service.id} className="border-b border-line last:border-b-0">
                <td className="px-4 py-3 font-medium text-ink">
                  {service.name}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {categoryName.get(service.category_id) ?? "—"}
                </td>
                <td className="px-4 py-3 text-ink tnum">
                  {formatUsd(service.price_cents, service.price_note)}
                </td>
                <td className="px-4 py-3">
                  <span className="flex flex-wrap gap-1.5">
                    <Badge tone={service.is_published ? "success" : "neutral"}>
                      {service.is_published ? "Published" : "Hidden"}
                    </Badge>
                    {service.requires_price_verification && (
                      <Badge tone="warning">Price unverified</Badge>
                    )}
                  </span>
                </td>
                {Boolean(canManage) && (
                  <td className="px-4 py-3">
                    <CatalogueRowControls service={service} />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardTitle>Plans & bundles</CardTitle>
        <p className="mt-1 text-sm text-ink-muted">
          Demonstration tiers ship unpublished. Publish only real,
          administrator-verified ProGuidance offers.
        </p>
        <ul className="mt-4 divide-y divide-line">
          {(plans ?? []).map((plan) => (
            <li
              key={plan.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-ink">{plan.name}</p>
                <p className="text-ink-muted tnum">
                  {formatUsd(plan.price_cents)}
                  {plan.billing_note ? ` ${plan.billing_note}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={plan.is_published ? "success" : "neutral"}>
                  {plan.is_published ? "Published" : "Unpublished"}
                </Badge>
                {Boolean(canManage) && <PlanRowControls plan={plan} />}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
