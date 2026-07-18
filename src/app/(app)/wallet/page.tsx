import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { formatDateUS, formatUsd } from "@/lib/format";
import { TopupForm } from "./topup-form";

export const metadata: Metadata = { title: "Wallet" };

export default async function WalletPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: wallets }, { data: ledger }, { data: memberships }] =
    await Promise.all([
      supabase.from("wallet_accounts").select("*"),
      supabase
        .from("wallet_ledger_entries")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("organization_memberships")
        .select("*")
        .eq("user_id", user.id),
    ]);

  const orgIds = (memberships ?? []).map((m) => m.organization_id);
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"]);

  const balance = (wallets ?? []).reduce(
    (sum, wallet) => sum + wallet.balance_cents,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Wallet & credits</h1>
        <p className="mt-1 text-sm text-ink-muted">
          USD-only balance backed by an append-only ledger. Top-ups are
          verified by our team before the balance changes.
        </p>
      </div>

      <Card className="flex items-center gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Wallet aria-hidden className="h-6 w-6 text-primary" />
        </span>
        <div>
          <p className="text-sm text-ink-muted">Available balance</p>
          <p className="text-3xl font-semibold text-ink tnum">
            {formatUsd(balance)}
          </p>
        </div>
      </Card>

      {(organizations ?? []).length > 0 && (
        <TopupForm organizations={organizations ?? []} />
      )}

      <Card>
        <CardTitle>Transactions</CardTitle>
        {ledger && ledger.length > 0 ? (
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-muted">
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Reference</th>
                <th className="py-2 text-right font-medium">Amount</th>
                <th className="py-2 text-right font-medium">Balance after</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-line last:border-b-0"
                >
                  <td className="py-2 text-ink-muted tnum">
                    {formatDateUS(entry.created_at)}
                  </td>
                  <td className="py-2 text-ink">{entry.reference ?? "—"}</td>
                  <td
                    className={`py-2 text-right tnum ${
                      entry.entry_type === "credit"
                        ? "text-success"
                        : "text-danger"
                    }`}
                  >
                    {entry.entry_type === "credit" ? "+" : "−"}
                    {formatUsd(entry.amount_cents)}
                  </td>
                  <td className="py-2 text-right text-ink tnum">
                    {formatUsd(entry.balance_after_cents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            No transactions yet. Approved top-ups and wallet payments appear
            here.
          </p>
        )}
      </Card>
    </div>
  );
}
