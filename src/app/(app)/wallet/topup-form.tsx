"use client";

import { useActionState } from "react";

import { submitPaymentProof, type PaymentActionState } from "../invoices/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: PaymentActionState = {};

export function TopupForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    submitPaymentProof,
    initialState,
  );

  return (
    <Card>
      <CardTitle>Request a top-up</CardTitle>
      <p className="mt-1 text-sm text-ink-muted">
        Send the funds by bank transfer or Wise, then record the reference —
        the balance is credited after our team verifies the payment.
      </p>
      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}
        <input type="hidden" name="method" value="wallet_topup" />
        {organizations.length === 1 ? (
          <input
            type="hidden"
            name="organizationId"
            value={organizations[0]?.id}
          />
        ) : (
          <div>
            <Label htmlFor="topup-org">Organization</Label>
            <select
              id="topup-org"
              name="organizationId"
              required
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="topup-amount">Amount (USD)</Label>
            <Input
              id="topup-amount"
              name="amount"
              type="number"
              min="1"
              step="0.01"
              required
              className="tnum"
            />
          </div>
          <div>
            <Label htmlFor="topup-reference">Transfer reference</Label>
            <Input id="topup-reference" name="reference" maxLength={200} />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit top-up for verification"}
        </Button>
      </form>
    </Card>
  );
}
