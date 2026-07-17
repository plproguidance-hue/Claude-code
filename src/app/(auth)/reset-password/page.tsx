import type { Metadata } from "next";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Choose a new password</h1>
      <p className="mt-1 text-sm text-ink-muted">
        You arrived here from a secure reset link. Set the new password for
        your account.
      </p>
      <ResetPasswordForm />
    </div>
  );
}
