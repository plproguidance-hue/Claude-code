"use client";

import { useActionState } from "react";

import {
  changePassword,
  signOutOtherSessions,
  type SecurityActionState,
} from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import { PasswordInput } from "@/app/(auth)/password-input";

const initialState: SecurityActionState = {};

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePassword,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <div>
        <Label htmlFor="currentPassword">Current password</Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="newPassword">New password</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          autoComplete="new-password"
          required
          minLength={12}
          aria-describedby="new-password-hint"
        />
        <p id="new-password-hint" className="mt-1.5 text-xs text-ink-muted">
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

      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}

export function SignOutOthersForm() {
  const [state, formAction, pending] = useActionState(
    signOutOtherSessions,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}
      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? "Revoking…" : "Sign out all other sessions"}
      </Button>
    </form>
  );
}
