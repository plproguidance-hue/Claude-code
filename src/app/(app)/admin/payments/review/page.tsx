import type { Metadata } from "next";
import { Inbox } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { PAYMENT_METHODS } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";
import { PaymentReviewCard } from "./payment-review-card";

export const metadata: Metadata = { title: "Payment review" };

export default async function PaymentReviewPage() {
  const supabase = await createClient();

  const [
    { data: canReview },
    { data: payments },
    { data: organizations },
    { data: invoices },
  ] = await Promise.all([
    supabase.rpc("has_permission", { perm: "payments.review" }),
    supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: true }),
    supabase.from("organizations").select("id, name"),
    supabase.from("invoices").select("id, invoice_number"),
  ]);

  const orgName = new Map(
    (organizations ?? []).map((o) => [o.id, o.name]),
  );
  const invoiceNumber = new Map(
    (invoices ?? []).map((i) => [i.id, i.invoice_number]),
  );
  const queue = (payments ?? []).filter((payment) =>
    ["submitted", "under_review"].includes(payment.status),
  );
  const decided = (payments ?? [])
    .filter((payment) => !["submitted", "under_review"].includes(payment.status))
    .slice(0, 20);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Payment proof review
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Approval atomically updates the payment, invoice balance/status,
          wallet ledger, and audit log in one transaction.
        </p>
      </div>

      {queue.length > 0 ? (
        <ul className="space-y-4">
          {queue.map((payment) => (
            <li key={payment.id}>
              <PaymentReviewCard
                payment={payment}
                organizationName={
                  orgName.get(payment.organization_id) ?? "Organization"
                }
                invoiceNumber={
                  payment.invoice_id
                    ? (invoiceNumber.get(payment.invoice_id) ?? null)
                    : null
                }
                canReview={Boolean(canReview)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <Card className="py-10 text-center">
          <Inbox aria-hidden className="mx-auto h-10 w-10 text-ink-muted" />
          <CardTitle className="mt-4">No payments awaiting review</CardTitle>
        </Card>
      )}

      {decided.length > 0 && (
        <Card>
          <CardTitle>Recently decided</CardTitle>
          <ul className="mt-3 divide-y divide-line text-sm">
            {decided.map((payment) => (
              <li
                key={payment.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="text-ink tnum">
                  {formatUsd(payment.amount_cents)} ·{" "}
                  {PAYMENT_METHODS[payment.method] ?? payment.method} ·{" "}
                  {formatDateUS(payment.created_at)}
                </span>
                <span className="text-xs capitalize text-ink-muted">
                  {payment.status}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
