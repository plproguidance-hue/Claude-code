import type { Metadata } from "next";
import { ExternalLink, Gift } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Perks & resources" };

export default async function PerksPage() {
  const supabase = await createClient();
  const { data: perks } = await supabase
    .from("perks_resources")
    .select("*")
    .eq("is_published", true)
    .order("sort");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Perks & resources</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Partner tools and services useful to US business owners. Listings
          may involve affiliate relationships — disclosures are shown on each
          card.
        </p>
      </div>

      {(perks ?? []).length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(perks ?? []).map((perk) => (
            <Card key={perk.id} className="flex h-full flex-col">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Gift aria-hidden className="h-4 w-4 text-primary" />
                  <CardTitle>{perk.name}</CardTitle>
                </div>
                <Badge tone="neutral">{perk.category}</Badge>
              </div>
              <p className="mt-2 flex-1 text-sm text-ink-muted">
                {perk.description}
              </p>
              {perk.benefit && (
                <p className="mt-2 text-sm font-medium text-ink">
                  {perk.benefit}
                </p>
              )}
              {perk.url && (
                <a
                  href={perk.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary-hover"
                >
                  Visit site
                  <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                </a>
              )}
              {perk.disclosure && (
                <p className="mt-3 border-t border-line pt-2 text-xs text-ink-muted">
                  {perk.disclosure}
                </p>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No published perks yet</CardTitle>
        </Card>
      )}
    </div>
  );
}
