import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { PAYMENT_METHODS, PAYMENT_STATUS } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage() {
  const supabase = await createClient();
  const { data: payments } = await supabase
    .from("payments")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Payments</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every payment proof you have submitted and its verification state.
          Submit proofs from an invoice, or top up your wallet from the{" "}
          <Link
            href="/wallet"
            className="font-medium text-primary hover:text-primary-hover"
          >
            wallet page
          </Link>
          .
        </p>
      </div>

      {payments && payments.length > 0 ? (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Payment proofs</caption>
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                <th className="px-4 py-3 font-medium">Submitted</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Reference</th>
                <th className="px-4 py-3 text-right font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => {
                const status = PAYMENT_STATUS[payment.status];
                return (
                  <tr
                    key={payment.id}
                    className="border-b border-line last:border-b-0"
                  >
                    <td className="px-4 py-3 text-ink-muted tnum">
                      {formatDateUS(payment.created_at)}
                    </td>
                    <td className="px-4 py-3 text-ink">
                      {PAYMENT_METHODS[payment.method] ?? payment.method}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {payment.reference ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-ink tnum">
                      {formatUsd(payment.amount_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={status?.tone ?? "neutral"}>
                        {status?.label ?? payment.status}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No payments yet</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            When you submit payment proof for an invoice or a wallet top-up,
            it appears here.
          </p>
        </Card>
      )}
    </div>
  );
}
