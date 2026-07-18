import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { serverEnv } from "@/lib/env";
import { brand } from "@/config/brand";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const [{ data: canManage }, { data: settings }, { data: outbox }] =
    await Promise.all([
      supabase.rpc("has_permission", { perm: "settings.manage" }),
      supabase.from("system_settings").select("*"),
      supabase
        .from("email_outbox")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  if (!canManage) {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <CardTitle>Settings access required</CardTitle>
        <p className="mt-2 text-sm text-ink-muted">
          Business configuration requires the{" "}
          <code className="text-xs">settings.manage</code> permission.
        </p>
      </Card>
    );
  }

  const env = serverEnv();
  const integrations: [string, boolean, string][] = [
    [
      "Supabase Storage (documents)",
      Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
      "Set SUPABASE_SERVICE_ROLE_KEY in the server environment.",
    ],
    [
      "Virus scanning (ClamAV)",
      process.env.VIRUS_SCAN_PROVIDER === "clamav",
      "Set VIRUS_SCAN_PROVIDER=clamav plus CLAMAV_HOST/PORT. Unscanned uploads stay quarantined.",
    ],
    [
      "Outbound email (SMTP/Resend worker)",
      Boolean(process.env.SMTP_URL ?? process.env.RESEND_API_KEY),
      "Configure a mail credential and run the outbox worker; queued rows wait safely until then.",
    ],
    [
      "Stripe payments adapter",
      false,
      "Optional later integration — feature-flagged, requires webhook signature verification before enabling.",
    ],
    [
      "PayPal payments adapter",
      false,
      "Optional later integration — feature-flagged, requires webhook signature verification before enabling.",
    ],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">
          Settings & integration status
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Status only — secret values are never displayed here.
        </p>
      </div>

      <Card>
        <CardTitle>Business configuration (typed source)</CardTitle>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          {(
            [
              ["Legal name", brand.legalName],
              ["Brand", `${brand.brandName} — ${brand.tagline}`],
              ["Public email", brand.publicEmail],
              ["Phone / WhatsApp", brand.phone],
              [
                "Address",
                `${brand.address.line1}, ${brand.address.city}, ${brand.address.state} ${brand.address.postalCode}`,
              ],
              ["Market / currency", `${brand.market} · ${brand.currency}`],
              ["Invoice prefix", brand.invoicePrefix],
              [
                "Logo",
                brand.logo.status === "official"
                  ? "Official wordmark installed"
                  : "PLACEHOLDER — owner must supply src/assets/logo.png",
              ],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-ink-muted">
                {label}
              </dt>
              <dd className="mt-0.5 text-ink">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-ink-muted">
          Source: src/config/brand.ts. Database overrides live in
          system_settings ({(settings ?? []).length} keys set).
        </p>
      </Card>

      <Card>
        <CardTitle>Integrations</CardTitle>
        <ul className="mt-3 divide-y divide-line">
          {integrations.map(([name, configured, hint]) => (
            <li
              key={name}
              className="flex flex-wrap items-center justify-between gap-3 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink">{name}</p>
                <p className="text-xs text-ink-muted">{hint}</p>
              </div>
              <Badge tone={configured ? "success" : "warning"}>
                {configured ? "Configured" : "Not configured"}
              </Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <CardTitle>Email outbox (latest 10)</CardTitle>
        {(outbox ?? []).length > 0 ? (
          <ul className="mt-3 divide-y divide-line text-sm">
            {(outbox ?? []).map((mail) => (
              <li
                key={mail.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="min-w-0 truncate text-ink">
                  {mail.subject}{" "}
                  <span className="text-xs text-ink-muted">
                    → {mail.to_email}
                  </span>
                </span>
                <Badge
                  tone={
                    mail.status === "sent"
                      ? "success"
                      : mail.status === "failed"
                        ? "danger"
                        : "warning"
                  }
                >
                  {mail.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            No queued emails yet. Security emails (like registration
            approvals) appear here and are sent once a mail credential is
            configured.
          </p>
        )}
      </Card>
    </div>
  );
}
