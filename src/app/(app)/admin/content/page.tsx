import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { ContentToggles } from "./content-toggles";

export const metadata: Metadata = { title: "Content" };

export default async function AdminContentPage() {
  const supabase = await createClient();
  const [
    { data: canManage },
    { data: categories },
    { data: articles },
    { data: perks },
  ] = await Promise.all([
    supabase.rpc("has_permission", { perm: "content.manage" }),
    supabase.from("help_categories").select("*").order("sort"),
    supabase.from("help_articles").select("*").order("sort"),
    supabase.from("perks_resources").select("*").order("sort"),
  ]);

  const categoryName = new Map(
    (categories ?? []).map((category) => [category.id, category.name]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Help Center & perks content
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Draft/publish control for articles and partner listings
          {!canManage && " (viewing only — content.manage required to change)"}.
        </p>
      </div>

      <Card>
        <CardTitle>Help articles</CardTitle>
        <ul className="mt-3 divide-y divide-line">
          {(articles ?? []).map((article) => (
            <li
              key={article.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{article.title}</p>
                <p className="text-xs text-ink-muted">
                  {categoryName.get(article.category_id) ?? "—"} · /help/
                  {article.slug}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={article.is_published ? "success" : "neutral"}>
                  {article.is_published ? "Published" : "Draft"}
                </Badge>
                {Boolean(canManage) && (
                  <ContentToggles
                    kind="article"
                    id={article.id}
                    published={article.is_published}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Perks & resources</CardTitle>
        <ul className="mt-3 divide-y divide-line">
          {(perks ?? []).map((perk) => (
            <li
              key={perk.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{perk.name}</p>
                <p className="text-xs text-ink-muted">{perk.category}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={perk.is_published ? "success" : "neutral"}>
                  {perk.is_published ? "Published" : "Hidden"}
                </Badge>
                {Boolean(canManage) && (
                  <ContentToggles
                    kind="perk"
                    id={perk.id}
                    published={perk.is_published}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
