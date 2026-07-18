import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TICKET_DEPARTMENTS, TICKET_STATUS } from "@/lib/tickets/labels";
import { formatDateUS } from "@/lib/format";

export const metadata: Metadata = { title: "Ticket inbox" };

export default async function AdminTicketsPage() {
  const supabase = await createClient();
  const [{ data: tickets }, { data: organizations }] = await Promise.all([
    supabase
      .from("tickets")
      .select("*")
      .order("updated_at", { ascending: false }),
    supabase.from("organizations").select("id, name"),
  ]);

  const orgName = new Map((organizations ?? []).map((o) => [o.id, o.name]));
  const needsAction = (tickets ?? []).filter((ticket) =>
    ["open", "reopened", "waiting_staff"].includes(ticket.status),
  );
  const rest = (tickets ?? []).filter(
    (ticket) => !["open", "reopened", "waiting_staff"].includes(ticket.status),
  );

  const renderRow = (ticket: NonNullable<typeof tickets>[number]) => {
    const status = TICKET_STATUS[ticket.status];
    return (
      <li
        key={ticket.id}
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
      >
        <div className="min-w-0">
          <Link
            href={`/tickets/${ticket.id}`}
            className="font-medium text-primary hover:text-primary-hover"
          >
            {ticket.subject}
          </Link>
          <p className="text-xs text-ink-muted tnum">
            {ticket.ticket_number} · {orgName.get(ticket.organization_id) ?? "—"}{" "}
            · {TICKET_DEPARTMENTS[ticket.department]} ·{" "}
            <span className="capitalize">{ticket.priority}</span> · updated{" "}
            {formatDateUS(ticket.updated_at)}
          </p>
        </div>
        <Badge tone={status?.tone ?? "neutral"}>
          {status?.label ?? ticket.status}
        </Badge>
      </li>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Ticket inbox</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Assignment, internal notes, and status controls live inside each
          ticket thread.
        </p>
      </div>

      <section aria-labelledby="needs-action">
        <h2 id="needs-action" className="mb-2 text-base font-semibold text-ink">
          Needs staff action ({needsAction.length})
        </h2>
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {needsAction.map(renderRow)}
            {needsAction.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-ink-muted">
                Inbox zero — nothing waiting on staff.
              </li>
            )}
          </ul>
        </Card>
      </section>

      {rest.length > 0 && (
        <section aria-labelledby="other-tickets">
          <h2
            id="other-tickets"
            className="mb-2 text-base font-semibold text-ink"
          >
            Everything else
          </h2>
          <Card className="p-0">
            <ul className="divide-y divide-line">{rest.map(renderRow)}</ul>
          </Card>
        </section>
      )}
    </div>
  );
}
