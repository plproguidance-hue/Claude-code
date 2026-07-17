"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

export function MfaChallengeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const supabase = createClient();
      const { data: factorData, error: listError } =
        await supabase.auth.mfa.listFactors();
      const factor = factorData?.totp?.[0];
      if (listError || !factor) {
        setError(
          "No authenticator is enrolled for this account. Contact support if you believe this is wrong.",
        );
        return;
      }
      const { error: verifyError } =
        await supabase.auth.mfa.challengeAndVerify({
          factorId: factor.id,
          code: code.trim(),
        });
      if (verifyError) {
        setError("That code didn't work. Check your app and try again.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <form onSubmit={verify} className="space-y-4" noValidate>
        {error && <Alert tone="error">{error}</Alert>}

        <div>
          <Label htmlFor="code">Authentication code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            required
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="123456"
            className="tnum tracking-widest"
          />
        </div>

        <Button
          type="submit"
          className="w-full"
          disabled={pending || code.trim().length < 6}
        >
          {pending ? "Verifying…" : "Verify"}
        </Button>
      </form>

      <form action="/auth/sign-out" method="post">
        <Button type="submit" variant="ghost" className="w-full">
          Cancel and sign out
        </Button>
      </form>
    </div>
  );
}
