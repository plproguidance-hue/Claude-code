"use client";

import { useActionState } from "react";
import { ArrowRightLeft, Rocket } from "lucide-react";

import { startCompany, type CompanyActionState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";

const initialState: CompanyActionState = {};

function StartCard({
  mode,
  title,
  description,
  cta,
  icon,
  organizations,
}: {
  mode: "formation" | "transfer";
  title: string;
  description: string;
  cta: string;
  icon: React.ReactNode;
  organizations: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    startCompany,
    initialState,
  );
  const single = organizations.length === 1;

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          {icon}
        </span>
        <CardTitle>{title}</CardTitle>
      </div>
      <p className="mt-2 flex-1 text-sm text-ink-muted">{description}</p>
      {state.error && (
        <Alert tone="error" className="mt-3">
          {state.error}
        </Alert>
      )}
      <form action={formAction} className="mt-4 space-y-3">
        <input type="hidden" name="mode" value={mode} />
        {single ? (
          <input
            type="hidden"
            name="organizationId"
            value={organizations[0]?.id}
          />
        ) : (
          <div>
            <Label htmlFor={`org-${mode}`}>Client organization</Label>
            <select
              id={`org-${mode}`}
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
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Starting…" : cta}
        </Button>
      </form>
    </Card>
  );
}

export function StartCompanyForms({
  organizations,
}: {
  organizations: { id: string; name: string; slug: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StartCard
        mode="formation"
        title="Start a new US formation"
        description="Form a new LLC, corporation, or other US entity. A resumable guided wizard collects everything our team needs."
        cta="Start formation"
        icon={<Rocket aria-hidden className="h-5 w-5 text-primary" />}
        organizations={organizations}
      />
      <StartCard
        mode="transfer"
        title="Transfer an existing company"
        description="Bring an existing US company under ProGuidance management. Your details stay private, and you can revise everything before we file with any authority."
        cta="Start transfer"
        icon={<ArrowRightLeft aria-hidden className="h-5 w-5 text-primary" />}
        organizations={organizations}
      />
    </div>
  );
}
