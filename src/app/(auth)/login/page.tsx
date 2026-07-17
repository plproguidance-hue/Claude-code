import type { Metadata } from "next";
import Link from "next/link";

import { Alert } from "@/components/ui/alert";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;

  return (
    <div>
      <h1 className="text-xl font-semibold text-ink">Sign in</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Welcome back. Enter your account details to continue.
      </p>

      <div className="mt-4 space-y-3">
        {params.message === "password-updated" && (
          <Alert tone="success">
            Your password has been updated. Sign in with the new password.
          </Alert>
        )}
        {params.error === "invalid-link" && (
          <Alert tone="error">
            That link is invalid or has expired. Sign in or request a new one.
          </Alert>
        )}
      </div>

      <LoginForm next={next} />

      <p className="mt-6 text-center text-sm text-ink-muted">
        New to ProGuidance?{" "}
        <Link
          href="/register"
          className="font-medium text-primary hover:text-primary-hover"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
