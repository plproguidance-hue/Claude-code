"use client";

import { useActionState } from "react";

import { issueInvoiceAction, type BillingActionState } from "../../billing/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: BillingActionState = {};

export function IssueInvoiceForm({ invoiceId }: { invoiceId: string }) {
  const [state, formAction, pending] = useActionState(
    issueInvoiceAction,
    initialState,
  );

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardTitle>Issue this invoice</CardTitle>
      <p className="mt-1 text-sm text-ink-muted">
        Issuing freezes the line items, stamps the dates, and makes the
        invoice visible to the client for payment.
      </p>
      <form action={formAction} className="mt-3 space-y-3">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}
        <input type="hidden" name="invoiceId" value={invoiceId} />
        <div className="max-w-xs">
          <Label htmlFor="issue-due">Due date (default: 14 days)</Label>
          <Input id="issue-due" name="dueDate" type="date" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Issuing…" : "Issue invoice"}
        </Button>
      </form>
    </Card>
  );
}
