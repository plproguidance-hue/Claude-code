"use client";

import { useActionState, useState } from "react";

import { register, type AuthActionState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "../password-input";

const initialState: AuthActionState = {};

function passwordStrength(value: string): {
  score: 0 | 1 | 2 | 3;
  label: string;
} {
  if (value.length === 0) return { score: 0, label: "" };
  let score = 0;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^a-zA-Z0-9]/.test(value)) score += 1;
  const labels = ["Too weak", "Weak", "Good", "Strong"] as const;
  return {
    score: score as 0 | 1 | 2 | 3,
    label: labels[score] ?? "Too weak",
  };
}

const meterTones = [
  "bg-danger",
  "bg-warning",
  "bg-info",
  "bg-success",
] as const;

export function RegisterForm({ lockedEmail }: { lockedEmail?: string }) {
  const [state, formAction, pending] = useActionState(register, initialState);
  const [password, setPassword] = useState("");
  const strength = passwordStrength(password);

  return (
    <form action={formAction} className="mt-6 space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div>
        <Label htmlFor="fullName">Full name</Label>
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          placeholder="Jordan Rivera"
        />
      </div>

      <div>
        <Label htmlFor="email">Email address</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@company.com"
          defaultValue={lockedEmail}
          readOnly={Boolean(lockedEmail)}
          aria-describedby={lockedEmail ? "email-locked-hint" : undefined}
        />
        {lockedEmail && (
          <p id="email-locked-hint" className="mt-1.5 text-xs text-ink-muted">
            The invitation is tied to this address.
          </p>
        )}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          aria-describedby="password-hint password-strength"
          onChange={(event) => setPassword(event.target.value)}
        />
        <p id="password-hint" className="mt-1.5 text-xs text-ink-muted">
          At least 12 characters with letters and numbers.
        </p>
        {password.length > 0 && (
          <div className="mt-2" id="password-strength" aria-live="polite">
            <div className="flex gap-1" aria-hidden>
              {[0, 1, 2].map((segment) => (
                <span
                  key={segment}
                  className={`h-1 flex-1 rounded-full ${
                    strength.score > segment
                      ? meterTones[strength.score]
                      : "bg-line"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-xs text-ink-muted">
              Password strength: {strength.label}
            </p>
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-xs text-ink-muted">
        By creating an account you agree to receive service and security
        emails about your account.
      </p>
    </form>
  );
}
