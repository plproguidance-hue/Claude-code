"use client";

import { useActionState } from "react";

import { createQuotation, type BillingActionState } from "../billing/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: BillingActionState = {};

export function NewQuotationForm({
  organizations,
}: {
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    createQuotation,
    initialState,
  );

  return (
    <Card>
      <CardTitle>New quotation draft</CardTitle>
      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="nq-org">Client organization</Label>
            <select
              id="nq-org"
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
          <div>
            <Label htmlFor="nq-title">Title</Label>
            <Input id="nq-title" name="title" required maxLength={200} />
          </div>
          <div>
            <Label htmlFor="nq-valid">Valid until (optional)</Label>
            <Input id="nq-valid" name="validUntil" type="date" />
          </div>
          <div>
            <Label htmlFor="nq-terms">Terms (optional)</Label>
            <Input id="nq-terms" name="terms" maxLength={2000} />
          </div>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create draft"}
        </Button>
      </form>
    </Card>
  );
}
