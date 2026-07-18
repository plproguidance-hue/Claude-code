import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { isStaffRole } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { TICKET_DEPARTMENTS, TICKET_STATUS } from "@/lib/tickets/labels";
import { TicketControls, TicketReplyForm } from "./ticket-thread";

export const metadata: Metadata = { title: "Ticket" };

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: ticket } = await supabase
    .from("tickets")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!ticket) notFound();

  const [{ data: messages }, { data: profile }, { data: staffProfiles }] =
    await Promise.all([
      supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at"),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .in("role", ["administrator", "manager", "moderator"]),
    ]);

  const staff = profile ? isStaffRole(profile.role) : false;
  const status = TICKET_STATUS[ticket.status];
  const authorName = new Map(
    (staffProfiles ?? []).map((p) => [p.id, p.full_name ?? p.email]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary tnum">
            {ticket.ticket_number}
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-ink">
            {ticket.subject}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {TICKET_DEPARTMENTS[ticket.department]} ·{" "}
            <span className="capitalize">{ticket.priority}</span> priority
            {ticket.assigned_to &&
              ` · assigned to ${authorName.get(ticket.assigned_to) ?? "staff"}`}
          </p>
        </div>
        <Badge tone={status?.tone ?? "neutral"}>
          {status?.label ?? ticket.status}
        </Badge>
      </div>

      <ol className="space-y-3">
        {(messages ?? []).map((message) => {
          const mine = message.author_id === user.id;
          const fromStaff = authorName.has(message.author_id ?? "");
          return (
            <li
              key={message.id}
              className={
                message.is_internal
                  ? "rounded-xl border border-charcoal/30 bg-charcoal/5 p-4"
                  : mine
                    ? "ml-6 rounded-xl border border-primary/20 bg-primary/5 p-4"
                    : "mr-6 rounded-xl border border-line bg-surface p-4"
              }
            >
              <p className="text-xs font-medium text-ink-muted">
                {message.is_internal && "Internal note · "}
                {mine
                  ? "You"
                  : fromStaff
                    ? `${authorName.get(message.author_id ?? "")} (ProGuidance)`
                    : "Client"}{" "}
                ·{" "}
                <span className="tnum">
                  {new Date(message.created_at).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-ink">
                {message.body}
              </p>
            </li>
          );
        })}
      </ol>

      {ticket.status === "closed" ? (
        <Card className="text-center">
          <p className="text-sm text-ink-muted">
            This ticket is closed and read-only.
          </p>
          <TicketControls ticket={ticket} staff={staff} staffList={[]} />
        </Card>
      ) : (
        <TicketReplyForm ticketId={ticket.id} staff={staff} />
      )}

      {staff && ticket.status !== "closed" && (
        <TicketControls
          ticket={ticket}
          staff={staff}
          staffList={(staffProfiles ?? []).map((p) => ({
            id: p.id,
            label: `${p.full_name ?? p.email} (${p.role})`,
          }))}
        />
      )}
    </div>
  );
}
