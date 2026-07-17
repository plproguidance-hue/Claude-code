"use client";

import { useActionState } from "react";

import { revealEin, type RevealEinState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/app/(auth)/password-input";

const initialState: RevealEinState = {};

export function RevealEin({ companyId }: { companyId: string }) {
  const [state, formAction, pending] = useActionState(revealEin, initialState);

  if (state.ein) {
    return (
      <div className="mt-4">
        <Alert tone="info">
          EIN revealed for this view only:{" "}
          <span className="tnum font-semibold">{state.ein}</span>
        </Alert>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-4 space-y-3" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="companyId" value={companyId} />
      <div>
        <Label htmlFor="reveal-password">Confirm your password</Label>
        <PasswordInput
          id="reveal-password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Checking…" : "Reveal EIN"}
      </Button>
    </form>
  );
}
