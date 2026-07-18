import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Reports" };

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data: canView } = await supabase.rpc("has_permission", {
    perm: "reports.view",
  });

  if (!canView) {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <CardTitle>Reports access required</CardTitle>
        <p className="mt-2 text-sm text-ink-muted">
          Viewing reports requires the{" "}
          <code className="text-xs">reports.view</code> permission.
        </p>
      </Card>
    );
  }

  const [
    { count: clients },
    { count: companies },
    { data: projects },
    { data: invoices },
    { count: openTickets },
    { count: pendingPayments },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "client"),
    supabase.from("companies").select("id", { count: "exact", head: true }),
    supabase.from("projects").select("status"),
    supabase.from("invoices").select("status, total_cents, amount_paid_cents"),
    supabase
      .from("tickets")
      .select("id", { count: "exact", head: true })
      .in("status", ["open", "reopened", "waiting_staff", "assigned"]),
    supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .in("status", ["submitted", "under_review"]),
  ]);

  const activeProjects = (projects ?? []).filter(
    (p) => !["completed", "cancelled", "draft"].includes(p.status),
  ).length;
  const completedProjects = (projects ?? []).filter(
    (p) => p.status === "completed",
  ).length;
  const revenue = (invoices ?? []).reduce(
    (sum, invoice) => sum + invoice.amount_paid_cents,
    0,
  );
  const outstanding = (invoices ?? [])
    .filter((invoice) =>
      ["sent", "viewed", "partially_paid", "overdue"].includes(invoice.status),
    )
    .reduce(
      (sum, invoice) =>
        sum + Math.max(invoice.total_cents - invoice.amount_paid_cents, 0),
      0,
    );

  const stats: [string, string][] = [
    ["Client accounts", String(clients ?? 0)],
    ["Companies", String(companies ?? 0)],
    ["Active projects", String(activeProjects)],
    ["Completed projects", String(completedProjects)],
    ["Revenue collected", formatUsd(revenue)],
    ["Outstanding balance", formatUsd(outstanding)],
    ["Open tickets", String(openTickets ?? 0)],
    ["Payments awaiting review", String(pendingPayments ?? 0)],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Reports</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Figures reflect your permission scope. Exports are authorized and
            audited.
          </p>
        </div>
        <a
          href="/admin/reports/export"
          className="rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink hover:border-charcoal"
        >
          Export invoices (CSV)
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(([label, value]) => (
          <Card key={label}>
            <p className="text-3xl font-semibold text-ink tnum">{value}</p>
            <p className="mt-2 text-sm font-medium text-ink-muted">{label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
