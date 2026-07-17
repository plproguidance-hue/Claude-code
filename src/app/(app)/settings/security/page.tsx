import type { Metadata } from "next";

import { Card, CardTitle } from "@/components/ui/card";
import { MfaManager } from "./mfa-manager";
import { PasswordForm, SignOutOthersForm } from "./security-forms";

export const metadata: Metadata = { title: "Security" };

export default function SecuritySettingsPage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Security</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Password, two-factor authentication, and session controls for your
          account.
        </p>
      </div>

      <Card>
        <CardTitle>Change password</CardTitle>
        <p className="mt-1 text-sm text-ink-muted">
          Your current password is required to set a new one.
        </p>
        <PasswordForm />
      </Card>

      <Card>
        <CardTitle>Two-factor authentication (TOTP)</CardTitle>
        <MfaManager />
      </Card>

      <Card>
        <CardTitle>Sessions</CardTitle>
        <p className="mt-1 text-sm text-ink-muted">
          Signed in somewhere you don&apos;t recognize? Revoke every session
          except this one. A per-device session list arrives with a later
          phase.
        </p>
        <SignOutOthersForm />
      </Card>
    </div>
  );
}
