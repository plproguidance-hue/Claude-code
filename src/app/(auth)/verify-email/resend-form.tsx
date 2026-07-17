"use client";

import { useActionState } from "react";

import { resendVerification, type AuthActionState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: AuthActionState = {};

export function ResendVerificationForm() {
  const [state, formAction, pending] = useActionState(
    resendVerification,
    initialState,
  );

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <div>
        <Label htmlFor="email">Didn&apos;t receive it? Resend to</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
        />
      </div>

      <Button
        type="submit"
        variant="secondary"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Sending…" : "Resend verification email"}
      </Button>
    </form>
  );
}
