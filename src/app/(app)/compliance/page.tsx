import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";
import { formatDateUS } from "@/lib/format";

export const metadata: Metadata = { title: "Compliance calendar" };

export default async function CompliancePage() {
  const supabase = await createClient();

  const [{ data: deadlines }, { data: companies }] = await Promise.all([
    supabase
      .from("company_compliance_deadlines")
      .select("*")
      .order("due_date"),
    supabase.from("companies").select("id, legal_name"),
  ]);

  const companyName = new Map(
    (companies ?? []).map((company) => [company.id, company.legal_name]),
  );
  const upcoming = (deadlines ?? []).filter(
    (deadline) => deadline.status !== "completed",
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Compliance calendar</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Annual reports, registered agent renewals, and tax deadlines across
          your companies. Dates are reminders, not legal advice.
        </p>
      </div>

      {upcoming.length > 0 ? (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {upcoming.map((deadline) => (
              <li
                key={deadline.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15">
                    <CalendarClock
                      aria-hidden
                      className="h-5 w-5 text-warning"
                    />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">
                      {deadline.title}
                    </p>
                    <Link
                      href={`/companies/${deadline.company_id}?tab=compliance`}
                      className="truncate text-xs text-primary hover:text-primary-hover"
                    >
                      {companyName.get(deadline.company_id) ?? "Company"}
                    </Link>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-ink tnum">
                    {formatDateUS(deadline.due_date)}
                  </p>
                  <p className="text-xs capitalize text-ink-muted">
                    {deadline.status}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No upcoming deadlines</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Deadlines appear here once your companies are active under
            ProGuidance compliance management.
          </p>
        </Card>
      )}
    </div>
  );
}
