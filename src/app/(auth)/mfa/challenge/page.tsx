import type { Metadata } from "next";

import { MfaChallengeForm } from "./mfa-challenge-form";

export const metadata: Metadata = { title: "Two-factor check" };

export default function MfaChallengePage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">
        Two-factor verification
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Enter the 6-digit code from your authenticator app to finish signing
        in.
      </p>
      <MfaChallengeForm />
    </div>
  );
}
