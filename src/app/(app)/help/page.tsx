import type { Metadata } from "next";
import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Help Center" };

export default async function HelpPage() {
  const supabase = await createClient();
  const [{ data: categories }, { data: articles }] = await Promise.all([
    supabase.from("help_categories").select("*").order("sort"),
    supabase
      .from("help_articles")
      .select("*")
      .eq("is_published", true)
      .order("sort"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Help Center</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Practical guides for US formation, documents, billing, marketplace
          setup, and account security. Can&apos;t find it?{" "}
          <Link
            href="/tickets"
            className="font-medium text-primary hover:text-primary-hover"
          >
            Contact support
          </Link>
          .
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(categories ?? []).map((category) => {
          const categoryArticles = (articles ?? []).filter(
            (article) => article.category_id === category.id,
          );
          if (categoryArticles.length === 0) return null;
          return (
            <Card key={category.id}>
              <div className="flex items-center gap-2">
                <LifeBuoy aria-hidden className="h-4 w-4 text-primary" />
                <CardTitle>{category.name}</CardTitle>
              </div>
              <ul className="mt-3 space-y-2">
                {categoryArticles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/help/${article.slug}`}
                      className="text-sm font-medium text-primary hover:text-primary-hover"
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
