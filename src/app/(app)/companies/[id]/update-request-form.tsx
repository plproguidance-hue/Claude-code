"use client";

import { useActionState } from "react";

import { requestCompanyUpdate, type CompanyActionState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";

const initialState: CompanyActionState = {};

const FIELDS: { name: string; label: string; placeholder?: string }[] = [
  { name: "legal_name", label: "Legal name" },
  { name: "dba", label: "DBA / trade name" },
  { name: "ein", label: "EIN", placeholder: "12-3456789" },
  { name: "formation_state", label: "Formation state (2-letter code)" },
  { name: "formation_date", label: "Formation date (YYYY-MM-DD)" },
  { name: "registered_agent_name", label: "Registered agent name" },
  { name: "business_purpose", label: "Business purpose" },
];

export function UpdateRequestForm({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(
    requestCompanyUpdate,
    initialState,
  );

  return (
    <Card>
      <CardTitle>Request a data update</CardTitle>
      <p className="mt-1 text-sm text-ink-muted">
        Fill only the fields that should change. Our team reviews every
        request before it is applied — authoritative filing data is never
        edited silently.
      </p>

      <form action={formAction} className="mt-4 space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}
        <input type="hidden" name="companyId" value={companyId} />

        <div className="grid gap-4 sm:grid-cols-2">
          {FIELDS.map((field) => (
            <div key={field.name}>
              <Label htmlFor={`ur-${field.name}`}>{field.label}</Label>
              <Input
                id={`ur-${field.name}`}
                name={field.name}
                placeholder={field.placeholder}
              />
            </div>
          ))}
        </div>

        <div>
          <Label htmlFor="evidenceNote">
            Evidence / context for the reviewer
          </Label>
          <textarea
            id="evidenceNote"
            name="evidenceNote"
            rows={3}
            maxLength={2000}
            placeholder="e.g. State amendment filed on …; certificate attached to ticket #…"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <Button type="submit" disabled={pending}>
          {pending ? "Filing…" : "File update request"}
        </Button>
      </form>
    </Card>
  );
}
