import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { formatDateUS } from "@/lib/format";

export const metadata: Metadata = { title: "Help article" };

export default async function HelpArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: article } = await supabase
    .from("help_articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();
  if (!article) notFound();

  const { data: related } = await supabase
    .from("help_articles")
    .select("id, title, slug")
    .eq("category_id", article.category_id)
    .eq("is_published", true)
    .neq("id", article.id)
    .order("sort")
    .limit(4);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/help"
          className="text-sm font-medium text-primary hover:text-primary-hover"
        >
          ← Help Center
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-ink">
          {article.title}
        </h1>
        <p className="mt-1 text-xs text-ink-muted tnum">
          Updated {formatDateUS(article.updated_at)}
        </p>
      </div>

      <Card>
        <div className="space-y-4 text-sm leading-relaxed text-ink">
          {article.body.split("\n\n").map((paragraph, index) => (
            <p key={index} className="whitespace-pre-wrap">
              {paragraph}
            </p>
          ))}
        </div>
      </Card>

      {(related ?? []).length > 0 && (
        <Card>
          <p className="text-sm font-semibold text-ink">Related articles</p>
          <ul className="mt-2 space-y-1.5">
            {(related ?? []).map((item) => (
              <li key={item.id}>
                <Link
                  href={`/help/${item.slug}`}
                  className="text-sm font-medium text-primary hover:text-primary-hover"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="bg-page/60 text-center">
        <p className="text-sm text-ink-muted">
          Still stuck?{" "}
          <Link
            href="/tickets"
            className="font-medium text-primary hover:text-primary-hover"
          >
            Open a support ticket
          </Link>{" "}
          and the right department will pick it up.
        </p>
      </Card>
    </div>
  );
}
