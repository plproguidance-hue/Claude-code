import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Service catalogue" };

export default async function ServicesPage() {
  const supabase = await createClient();

  const [{ data: categories }, { data: services }] = await Promise.all([
    supabase.from("service_categories").select("*").order("sort"),
    supabase
      .from("services")
      .select("*")
      .eq("is_published", true)
      .order("sort"),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Service catalogue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          USA-focused business services, billed in USD. Government and
          third-party fees are always shown separately and are outside
          ProGuidance&apos;s control.
        </p>
      </div>

      {(categories ?? []).map((category) => {
        const categoryServices = (services ?? []).filter(
          (service) => service.category_id === category.id,
        );
        if (categoryServices.length === 0) return null;
        return (
          <section key={category.id} aria-labelledby={`cat-${category.slug}`}>
            <h2
              id={`cat-${category.slug}`}
              className="mb-3 text-base font-semibold text-ink"
            >
              {category.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoryServices.map((service) => (
                <Card key={service.id} className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-ink">{service.name}</p>
                    <p className="shrink-0 text-lg font-semibold text-ink tnum">
                      {formatUsd(service.price_cents, service.price_note)}
                    </p>
                  </div>
                  <p className="mt-2 flex-1 text-sm text-ink-muted">
                    {service.summary}
                  </p>
                  {service.requires_price_verification && (
                    <div className="mt-3">
                      <Badge tone="warning">
                        Price pending final verification
                      </Badge>
                    </div>
                  )}
                  <Link
                    href={`/services/${service.slug}`}
                    className="mt-4 text-sm font-medium text-primary hover:text-primary-hover"
                  >
                    View details & order
                  </Link>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {(services ?? []).length === 0 && (
        <Card className="py-10 text-center">
          <p className="text-sm text-ink-muted">
            No services are published yet. Check back soon.
          </p>
        </Card>
      )}
    </div>
  );
}
