"use client";

import { useCallback, useEffect, useState } from "react";
import type { Factor } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/client";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

type Enrollment = {
  factorId: string;
  qrCode: string;
  secret: string;
};

/**
 * TOTP lifecycle against Supabase Auth MFA. The enrolment secret and QR are
 * displayed once during setup and never persisted client-side. Requires a
 * live Supabase instance (local stack or hosted) — without one the manager
 * reports the connection failure instead of pretending.
 */
export function MfaManager() {
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data, error: listError } = await supabase.auth.mfa.listFactors();
      if (listError) {
        setError("Could not load two-factor status.");
        return;
      }
      setFactors(data?.totp ?? []);
    } catch {
      setError(
        "Two-factor management needs a reachable Supabase instance. Start the local stack or configure the hosted project.",
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function startEnrollment() {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });
      if (enrollError || !data) {
        setError("Could not start enrolment. Try again.");
        return;
      }
      setEnrollment({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch {
      setError("Enrolment failed — Supabase is not reachable.");
    } finally {
      setPending(false);
    }
  }

  async function confirmEnrollment(event: React.FormEvent) {
    event.preventDefault();
    if (!enrollment) return;
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify(
        { factorId: enrollment.factorId, code: code.trim() },
      );
      if (verifyError) {
        setError("That code didn't match. Check your authenticator app.");
        return;
      }
      setEnrollment(null);
      setCode("");
      setMessage("Two-factor authentication is now enabled.");
      await refresh();
    } finally {
      setPending(false);
    }
  }

  async function unenroll(factorId: string) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      const supabase = createClient();
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId,
      });
      if (unenrollError) {
        setError("Could not remove the authenticator. Try again.");
        return;
      }
      setMessage("Authenticator removed.");
      await refresh();
    } finally {
      setPending(false);
    }
  }

  const verified = (factors ?? []).filter(
    (factor) => factor.status === "verified",
  );

  return (
    <div className="mt-4 space-y-4">
      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {verified.length > 0 ? (
        <div className="space-y-3">
          <Alert tone="success">
            Two-factor authentication is enabled on this account.
          </Alert>
          {verified.map((factor) => (
            <div
              key={factor.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-sm"
            >
              <span className="text-ink">
                Authenticator app
                {factor.friendly_name ? ` — ${factor.friendly_name}` : ""}
              </span>
              <Button
                type="button"
                variant="danger"
                size="sm"
                disabled={pending}
                onClick={() => void unenroll(factor.id)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      ) : enrollment ? (
        <form onSubmit={confirmEnrollment} className="space-y-4">
          <p className="text-sm text-ink-muted">
            Scan the QR code with your authenticator app, or enter the secret
            manually. This secret is shown once — it is never displayed again
            after enrolment.
          </p>
          {/* Supabase returns the QR as an SVG data URL */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enrollment.qrCode}
            alt="TOTP enrolment QR code"
            width={176}
            height={176}
            className="rounded-lg border border-line bg-white p-2"
          />
          <p className="break-all rounded-lg bg-page px-3 py-2 text-xs text-ink tnum">
            {enrollment.secret}
          </p>
          <div>
            <Label htmlFor="mfa-code">Confirmation code</Label>
            <Input
              id="mfa-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="123456"
              className="tnum tracking-widest"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              disabled={pending || code.trim().length < 6}
            >
              {pending ? "Verifying…" : "Confirm & enable"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEnrollment(null)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Protect your account with a time-based one-time password (TOTP)
            app such as any standard authenticator.
          </p>
          <Button
            type="button"
            onClick={() => void startEnrollment()}
            disabled={pending || factors === null}
          >
            {pending ? "Preparing…" : "Enable two-factor authentication"}
          </Button>
        </div>
      )}
    </div>
  );
}
