import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, UserCog, Users } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin overview" };

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [pending, users, orgs] = await Promise.all([
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending_approval"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("organizations").select("id", { count: "exact", head: true }),
  ]);

  const stats = [
    {
      label: "Pending registrations",
      value: pending.count ?? 0,
      href: "/admin/registrations",
      icon: UserCog,
      urgent: (pending.count ?? 0) > 0,
    },
    {
      label: "Users you can see",
      value: users.count ?? 0,
      href: "/admin/users",
      icon: Users,
      urgent: false,
    },
    {
      label: "Organizations",
      value: orgs.count ?? 0,
      href: "/admin",
      icon: Building2,
      urgent: false,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Operations overview</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Counts reflect your permission scope: administrators see everything,
          managers and moderators see assigned organizations only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map(({ label, value, href, icon: Icon, urgent }) => (
          <Card
            key={label}
            className={urgent ? "border-warning/50 bg-warning/5" : undefined}
          >
            <div className="flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-charcoal/10">
                <Icon aria-hidden className="h-5 w-5 text-charcoal" />
              </span>
              <span className="tnum text-3xl font-semibold text-ink">
                {value}
              </span>
            </div>
            <p className="mt-3 text-sm font-medium text-ink">{label}</p>
            <Link
              href={href}
              className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary-hover"
            >
              View
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </Card>
        ))}
      </div>

      <Card className="bg-page/60">
        <p className="text-sm font-medium text-ink">
          Client, company, project, document, billing, ticket, and content
          operations
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          These consoles arrive in later phases (see docs/06-implementation-plan.md).
          The permission framework and audit trail underneath them are already
          live.
        </p>
      </Card>
    </div>
  );
}
