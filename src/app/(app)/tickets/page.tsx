import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardTitle } from "@/components/ui/card";
import { TICKET_DEPARTMENTS, TICKET_STATUS } from "@/lib/tickets/labels";
import { formatDateUS } from "@/lib/format";
import { NewTicketForm } from "./new-ticket-form";

export const metadata: Metadata = { title: "Support tickets" };

export default async function TicketsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tickets }, { data: memberships }] = await Promise.all([
    supabase.from("tickets").select("*").order("updated_at", { ascending: false }),
    supabase.from("organization_memberships").select("*").eq("user_id", user.id),
  ]);
  const orgIds = (memberships ?? []).map((m) => m.organization_id);
  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name")
    .in("id", orgIds.length > 0 ? orgIds : ["00000000-0000-0000-0000-000000000000"]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Support</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Open a ticket with the right department — our team replies in the
          thread and you&apos;re never left guessing whose turn it is.
        </p>
      </div>

      {(organizations ?? []).length > 0 && (
        <NewTicketForm organizations={organizations ?? []} />
      )}

      {tickets && tickets.length > 0 ? (
        <Card className="p-0">
          <ul className="divide-y divide-line">
            {tickets.map((ticket) => {
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
                      {ticket.ticket_number} ·{" "}
                      {TICKET_DEPARTMENTS[ticket.department]} · updated{" "}
                      {formatDateUS(ticket.updated_at)}
                    </p>
                  </div>
                  <Badge tone={status?.tone ?? "neutral"}>
                    {status?.label ?? ticket.status}
                  </Badge>
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <Card className="py-10 text-center">
          <CardTitle>No tickets yet</CardTitle>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-muted">
            Questions about an order, document, or invoice? Open a ticket
            above.
          </p>
        </Card>
      )}
    </div>
  );
}
