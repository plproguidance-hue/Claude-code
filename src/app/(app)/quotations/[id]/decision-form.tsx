"use client";

import { useActionState } from "react";

import { decideQuotation, type QuoteActionState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: QuoteActionState = {};

export function DecisionForm({ quoteId }: { quoteId: string }) {
  const [state, formAction, pending] = useActionState(
    decideQuotation,
    initialState,
  );

  if (state.message) {
    return (
      <Card>
        <Alert tone="success">{state.message}</Alert>
      </Card>
    );
  }

  return (
    <Card>
      <CardTitle>Your decision</CardTitle>
      <form action={formAction} className="mt-4 space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <input type="hidden" name="quoteId" value={quoteId} />
        <div>
          <Label htmlFor="decision-note">Note (optional)</Label>
          <Input
            id="decision-note"
            name="note"
            maxLength={1000}
            placeholder="e.g. please adjust the turnaround"
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="confirm" className="mt-0.5" required />
          <span>
            I confirm this decision on behalf of my organization. Accepting
            creates an order for our team to process — the invoice is issued
            separately and nothing is charged automatically.
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" name="decision" value="accept" disabled={pending}>
            Accept quotation
          </Button>
          <Button
            type="submit"
            name="decision"
            value="request_changes"
            variant="secondary"
            disabled={pending}
          >
            Request changes
          </Button>
          <Button
            type="submit"
            name="decision"
            value="decline"
            variant="danger"
            disabled={pending}
          >
            Decline
          </Button>
        </div>
      </form>
    </Card>
  );
}
