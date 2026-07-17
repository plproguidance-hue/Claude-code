import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";

import { ResendVerificationForm } from "./resend-form";

export const metadata: Metadata = { title: "Verify your email" };

export default function VerifyEmailPage() {
  return (
    <div>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        <MailCheck aria-hidden className="h-6 w-6 text-primary" />
      </div>
      <h1 className="text-xl font-semibold text-ink">Check your email</h1>
      <p className="mt-2 text-sm text-ink-muted">
        We&apos;ve sent a verification link to your address. Click it to
        confirm your email — your registration then waits for approval by our
        team, and you&apos;ll be notified when your account is activated.
      </p>

      <ResendVerificationForm />

      <p className="mt-6 text-center text-sm text-ink-muted">
        Wrong address?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Register again
        </Link>
      </p>
    </div>
  );
}
