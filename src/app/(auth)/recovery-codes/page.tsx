import type { Metadata } from "next";
import Link from "next/link";
import { KeyRound } from "lucide-react";

export const metadata: Metadata = { title: "Recovery codes" };

export default function RecoveryCodesPage() {
  return (
    <div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <KeyRound aria-hidden className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-xl font-semibold text-ink">Recovery codes</h1>
      <p className="mt-2 text-sm text-ink-muted">
        Recovery codes are generated once when you enable two-factor
        authentication and shown a single time. Two-factor enrolment (with QR
        setup and recovery-code generation) arrives with the Security settings
        area in the next phase of the portal.
      </p>
      <p className="mt-3 text-sm text-ink-muted">
        Lost access to your authenticator already? Contact support to verify
        your identity and reset two-factor authentication.
      </p>
      <Link
        href="/dashboard"
        className="mt-6 inline-block text-sm font-medium text-primary hover:text-primary-hover"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
