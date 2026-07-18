"use client";

import { useActionState } from "react";

import { requestQuotation, type QuoteActionState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: QuoteActionState = {};

export function RequestQuoteForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    requestQuotation,
    initialState,
  );

  return (
    <Card>
      <CardTitle>Request a quotation</CardTitle>
      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}

        {organizations.length === 1 ? (
          <input
            type="hidden"
            name="organizationId"
            value={organizations[0]?.id}
          />
        ) : (
          <div>
            <Label htmlFor="quote-org">Organization</Label>
            <select
              id="quote-org"
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

        <div>
          <Label htmlFor="quote-title">What do you need?</Label>
          <Input
            id="quote-title"
            name="title"
            required
            maxLength={200}
            placeholder="e.g. LLC formation + EIN + Stripe setup bundle"
          />
        </div>
        <div>
          <Label htmlFor="quote-note">Details (optional)</Label>
          <textarea
            id="quote-note"
            name="note"
            rows={3}
            maxLength={2000}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Request quotation"}
        </Button>
      </form>
    </Card>
  );
}
