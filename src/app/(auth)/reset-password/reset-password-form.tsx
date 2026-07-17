"use client";

import { useActionState } from "react";

import { updatePassword, type AuthActionState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "../password-input";

const initialState: AuthActionState = {};

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    updatePassword,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div>
        <Label htmlFor="password">New password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="mt-1.5 text-xs text-ink-muted">
          At least 12 characters with letters and numbers.
        </p>
      </div>

      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <PasswordInput
          id="confirm"
          name="confirm"
          autoComplete="new-password"
          required
          minLength={12}
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
