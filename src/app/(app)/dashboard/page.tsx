import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Building2 } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { brand } from "@/config/brand";
import { isStaffRole } from "@/lib/auth/permissions";
import { Card, CardTitle } from "@/components/ui/card";
import { RoleBadge } from "@/components/ui/badge";
import { MilestonePathGraphic } from "@/components/graphics/milestone-path";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: organizations }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("organizations").select("id, name, slug").order("name"),
  ]);
  if (!profile) redirect("/pending-approval");

  const firstName = profile.full_name?.split(" ")[0] ?? "there";
  const staff = isStaffRole(profile.role);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {brand.brandName} portal · {brand.tagline}
          </p>
        </div>
        <RoleBadge role={profile.role} />
      </div>

      {staff && (
        <Card className="flex flex-wrap items-center justify-between gap-4 border-primary/30 bg-primary/5">
          <div>
            <CardTitle>Operations console</CardTitle>
            <p className="mt-1 text-sm text-ink-muted">
              Review pending registrations and manage users.
            </p>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-hover motion-safe:transition-colors"
          >
            Open admin
            <ArrowRight aria-hidden className="h-4 w-4" />
          </Link>
        </Card>
      )}

      <section aria-labelledby="orgs-heading">
        <h2 id="orgs-heading" className="mb-3 text-base font-semibold text-ink">
          {staff ? "Organizations you can access" : "Your organizations"}
        </h2>
        {organizations && organizations.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Card key={org.id} className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-charcoal/10">
                  <Building2 aria-hidden className="h-5 w-5 text-charcoal" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{org.name}</p>
                  <p className="truncate text-xs text-ink-muted">{org.slug}</p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:text-left">
            <MilestonePathGraphic className="w-64 max-w-full shrink-0" />
            <div>
              <CardTitle>No organization yet</CardTitle>
              <p className="mt-1 max-w-md text-sm text-ink-muted">
                Your account is active but not linked to a client organization
                yet. Our team sets this up as part of onboarding — if you
                expected access already, contact{" "}
                <a
                  className="font-medium text-primary hover:text-primary-hover"
                  href={`mailto:${brand.publicEmail}`}
                >
                  {brand.publicEmail}
                </a>
                .
              </p>
            </div>
          </Card>
        )}
      </section>

      <section aria-labelledby="soon-heading">
        <h2 id="soon-heading" className="mb-3 text-base font-semibold text-ink">
          Coming to your portal
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Companies & compliance", "Formation data, deadlines, and filings"],
            ["Services & projects", "Order services and track milestones"],
            ["Secure documents", "Private vault with reviews and versions"],
            ["Billing", "Invoices, payments, and USD wallet"],
          ].map(([title, description]) => (
            <Card key={title} className="bg-page/60">
              <p className="text-sm font-medium text-ink">{title}</p>
              <p className="mt-1 text-xs text-ink-muted">{description}</p>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-muted/70">
                Planned
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
