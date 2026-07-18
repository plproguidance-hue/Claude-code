import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";
import { OrderForm } from "./order-form";

export const metadata: Metadata = { title: "Service" };

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: service } = await supabase
    .from("services")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!service) notFound();

  const { data: memberships } = await supabase
    .from("organization_memberships")
    .select("*")
    .eq("user_id", user.id);
  const orgIds = (memberships ?? []).map((m) => m.organization_id);

  const [{ data: organizations }, { data: companies }] = await Promise.all([
    orgIds.length > 0
      ? supabase.from("organizations").select("id, name, slug").in("id", orgIds)
      : Promise.resolve({
          data: [] as { id: string; name: string; slug: string }[],
        }),
    orgIds.length > 0
      ? supabase
          .from("companies")
          .select("id, legal_name, organization_id, status")
          .in("organization_id", orgIds)
          .neq("status", "draft")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link
          href="/services"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Catalogue
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold text-ink">{service.name}</h1>
          <p className="text-2xl font-semibold text-ink tnum">
            {formatUsd(service.price_cents, service.price_note)}
          </p>
        </div>
        {service.requires_price_verification && (
          <div className="mt-2">
            <Badge tone="warning">
              Seed price — pending administrator verification
            </Badge>
          </div>
        )}
      </div>

      <Card>
        <CardTitle>What&apos;s included</CardTitle>
        <p className="mt-2 text-sm text-ink">
          {service.description ?? service.summary}
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Government / third-party fees</dt>
            <dd className="text-right text-ink">
              {service.government_fee_note ??
                "Billed separately at actual cost where applicable"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Estimated turnaround</dt>
            <dd className="text-ink">
              {service.turnaround ?? "Confirmed after order review"}
            </dd>
          </div>
          {service.requirements && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-muted">You&apos;ll need</dt>
              <dd className="text-right text-ink">{service.requirements}</dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-xs text-ink-muted">
          ProGuidance provides professional processing and support. Government,
          platform, banking, tax, and third-party approval decisions are
          outside our control. Nothing here is legal or tax advice.
        </p>
      </Card>

      {(organizations ?? []).length > 0 ? (
        <Card>
          <CardTitle>Order this service</CardTitle>
          <OrderForm
            serviceId={service.id}
            organizations={organizations ?? []}
            companies={(companies ?? []).map((company) => ({
              id: company.id,
              legalName: company.legal_name,
              organizationId: company.organization_id,
            }))}
          />
        </Card>
      ) : (
        <Card className="border-warning/50 bg-warning/5">
          <p className="text-sm text-ink">
            Ordering requires a client organization on your account. Contact
            our team to complete onboarding first.
          </p>
        </Card>
      )}
    </div>
  );
}
