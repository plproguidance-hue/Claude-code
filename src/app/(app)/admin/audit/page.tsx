import type { Metadata } from "next";

import { createClient } from "@/lib/supabase/server";
import { Card, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Audit log" };

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const actionFilter =
    typeof params.action === "string" ? params.action.trim() : "";

  const supabase = await createClient();
  const [{ data: canView }, { data: profiles }] = await Promise.all([
    supabase.rpc("has_permission", { perm: "audit.view" }),
    supabase.from("profiles").select("id, full_name, email"),
  ]);

  if (!canView) {
    return (
      <Card className="mx-auto mt-10 max-w-md text-center">
        <CardTitle>Audit access required</CardTitle>
        <p className="mt-2 text-sm text-ink-muted">
          Viewing the audit log requires the{" "}
          <code className="text-xs">audit.view</code> permission
          (administrators by default).
        </p>
      </Card>
    );
  }

  let query = supabase
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (actionFilter) query = query.ilike("action", `%${actionFilter}%`);
  const { data: events } = await query;

  const actorName = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Audit log</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Append-only record of security-relevant events. Showing the latest
          200{actionFilter && ` matching "${actionFilter}"`}.
        </p>
      </div>

      <form method="get" className="flex max-w-md gap-2">
        <input
          type="search"
          name="action"
          defaultValue={actionFilter}
          placeholder="Filter by action, e.g. registration or invoice"
          aria-label="Filter by action"
          className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="rounded-lg bg-charcoal px-4 text-sm font-medium text-white hover:bg-graphite"
        >
          Filter
        </button>
      </form>

      <Card className="overflow-x-auto p-0">
        <table className="w-full min-w-[720px] text-left text-sm">
          <caption className="sr-only">Audit events</caption>
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-3 font-medium">When</th>
              <th className="px-4 py-3 font-medium">Actor</th>
              <th className="px-4 py-3 font-medium">Action</th>
              <th className="px-4 py-3 font-medium">Entity</th>
              <th className="px-4 py-3 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {(events ?? []).map((event) => (
              <tr key={event.id} className="border-b border-line last:border-b-0 align-top">
                <td className="px-4 py-3 text-ink-muted tnum">
                  {new Date(event.created_at).toLocaleString("en-US", {
                    dateStyle: "short",
                    timeStyle: "medium",
                  })}
                </td>
                <td className="px-4 py-3 text-ink">
                  {event.actor_id
                    ? (actorName.get(event.actor_id) ?? event.actor_id.slice(0, 8))
                    : "System"}
                </td>
                <td className="px-4 py-3 font-medium text-ink">
                  {event.action}
                </td>
                <td className="px-4 py-3 text-ink-muted">
                  {event.entity_type}
                </td>
                <td className="px-4 py-3 text-xs text-ink-muted">
                  {JSON.stringify(event.metadata)}
                </td>
              </tr>
            ))}
            {(events ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-ink-muted">
                  No events match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
