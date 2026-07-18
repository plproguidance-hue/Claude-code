"use client";

import { useActionState } from "react";
import { Printer } from "lucide-react";

import { submitPaymentProof, type PaymentActionState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { formatUsd } from "@/lib/format";

const initialState: PaymentActionState = {};

export function PrintButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => window.print()}
    >
      <Printer aria-hidden className="h-4 w-4" />
      Print / PDF
    </Button>
  );
}

export function PayProofForm({
  organizationId,
  invoiceId,
  balanceCents,
}: {
  organizationId: string;
  invoiceId: string;
  balanceCents: number;
}) {
  const [state, formAction, pending] = useActionState(
    submitPaymentProof,
    initialState,
  );

  return (
    <Card className="print:hidden">
      <CardTitle>Submit payment proof</CardTitle>
      <p className="mt-1 text-sm text-ink-muted">
        Pay by bank transfer, Wise, or another manual method, then record the
        details here. Our team verifies every payment before the balance
        updates — outstanding balance: {formatUsd(balanceCents)}.
      </p>
      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}
        <input type="hidden" name="organizationId" value={organizationId} />
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pay-method">Method</Label>
            <select
              id="pay-method"
              name="method"
              defaultValue="bank_transfer"
              className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="bank_transfer">Bank transfer</option>
              <option value="wise">Wise</option>
              <option value="manual">Other manual payment</option>
            </select>
          </div>
          <div>
            <Label htmlFor="pay-amount">Amount paid (USD)</Label>
            <Input
              id="pay-amount"
              name="amount"
              type="number"
              min="0.01"
              step="0.01"
              required
              defaultValue={(balanceCents / 100).toFixed(2)}
              className="tnum"
            />
          </div>
          <div>
            <Label htmlFor="pay-reference">Transaction reference</Label>
            <Input id="pay-reference" name="reference" maxLength={200} />
          </div>
          <div>
            <Label htmlFor="pay-date">Payment date</Label>
            <Input id="pay-date" name="paidDate" type="date" />
          </div>
        </div>
        <div>
          <Label htmlFor="pay-note">Note (optional)</Label>
          <Input id="pay-note" name="note" maxLength={1000} />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit payment proof"}
        </Button>
      </form>
    </Card>
  );
}
