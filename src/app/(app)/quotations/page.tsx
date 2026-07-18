import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { QUOTATION_STATUS } from "@/lib/billing/labels";
import { formatDateUS } from "@/lib/format";
import { RequestQuoteForm } from "./request-quote-form";

export const metadata: Metadata = { title: "Quotations" };

export default async function QuotationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: quotations }, { data: memberships }] = await Promise.all([
    supabase
      .from("quotations")
      .select("*")
      .order("created_at", { ascending: false }),
    supabase.from("organization_memberships").select("*").eq("user_id", user.id),
  ]);
  const orgIds = (memberships ?? []).map((m) => m.organization_id);
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Quotations</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Request custom pricing, review offers, and accept or decline —
          every decision is recorded with who and when.
        </p>
      </div>

      {(organizations ?? []).length > 0 && (
        <RequestQuoteForm organizations={organizations ?? []} />
      )}

      {quotations && quotations.length > 0 ? (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {quotations.map((quotation) => {
              const status = QUOTATION_STATUS[quotation.status];
              return (
                <li
                  key={quotation.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/quotations/${quotation.id}`}
                      className="font-medium text-primary hover:text-primary-hover"
                    >
                      {quotation.title}
                    </Link>
                    <p className="text-xs text-ink-muted tnum">
                      {quotation.quote_number} ·{" "}
                      {formatDateUS(quotation.created_at)}
                      {quotation.valid_until &&
                        ` · valid until ${formatDateUS(quotation.valid_until)}`}
                    </p>
                  </div>
                  <Badge tone={status?.tone ?? "neutral"}>
                    {status?.label ?? quotation.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No quotations yet</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Request a quotation above or from any service page.
          </p>
        </Card>
      )}
    </div>
  );
}
