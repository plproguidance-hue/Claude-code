"use client";

import { useActionState, useState } from "react";

import { orderService, type OrderActionState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";

const initialState: OrderActionState = {};

export function OrderForm({
  serviceId,
  organizations,
  companies,
}: {
  serviceId: string;
  organizations: { id: string; name: string }[];
  companies: { id: string; legalName: string; organizationId: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    orderService,
    initialState,
  );
  const [orgId, setOrgId] = useState(organizations[0]?.id ?? "");
  const orgCompanies = companies.filter(
    (company) => company.organizationId === orgId,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="serviceId" value={serviceId} />

      {organizations.length === 1 ? (
        <input type="hidden" name="organizationId" value={orgId} />
      ) : (
        <div>
          <Label htmlFor="order-org">Client organization</Label>
          <select
            id="order-org"
            name="organizationId"
            required
            value={orgId}
            onChange={(event) => setOrgId(event.target.value)}
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
        <Label htmlFor="order-company">Related company (optional)</Label>
        <select
          id="order-company"
          name="companyId"
          defaultValue=""
          className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Not linked to a company yet</option>
          {orgCompanies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.legalName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="order-note">Anything we should know? (optional)</Label>
        <textarea
          id="order-note"
          name="note"
          rows={3}
          maxLength={2000}
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Placing order…" : "Order service"}
      </Button>
      <p className="text-xs text-ink-muted">
        Placing an order creates a project for our team to review — you are
        not charged by this click. Payment is arranged through an issued
        invoice.
      </p>
    </form>
  );
}
