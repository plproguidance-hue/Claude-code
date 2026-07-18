"use client";

import { useActionState } from "react";

import type { TicketRow } from "@/lib/database.types";
import {
  changeTicketStatus,
  replyToTicket,
  type TicketActionState,
} from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";

const initialState: TicketActionState = {};

export function TicketReplyForm({
  ticketId,
  staff,
}: {
  ticketId: string;
  staff: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    replyToTicket,
    initialState,
  );

  return (
    <Card>
      <CardTitle>Reply</CardTitle>
      <form action={formAction} className="mt-3 space-y-3" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}
        <input type="hidden" name="ticketId" value={ticketId} />
        <div>
          <Label htmlFor="reply-body" className="sr-only">
            Your message
          </Label>
          <textarea
            id="reply-body"
            name="body"
            rows={3}
            required
            maxLength={10000}
            placeholder="Write your message…"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {staff && (
          <label className="flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="internal" />
            Internal note (never visible to the client)
          </label>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send reply"}
        </Button>
      </form>
    </Card>
  );
}

export function TicketControls({
  ticket,
  staff,
  staffList,
}: {
  ticket: TicketRow;
  staff: boolean;
  staffList: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState(
    changeTicketStatus,
    initialState,
  );

  return (
    <div className="mt-3 space-y-3">
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <div className="flex flex-wrap items-end gap-2">
        {["resolved", "closed"].includes(ticket.status) && (
          <form action={formAction}>
            <input type="hidden" name="ticketId" value={ticket.id} />
            <Button
              type="submit"
              name="status"
              value="reopened"
              variant="secondary"
              size="sm"
              disabled={pending}
            >
              Reopen ticket
            </Button>
          </form>
        )}

        {staff && ticket.status !== "closed" && (
          <>
            {staffList.length > 0 && (
              <form action={formAction} className="flex items-end gap-2">
                <input type="hidden" name="ticketId" value={ticket.id} />
                <input type="hidden" name="status" value="assigned" />
                <div>
                  <Label htmlFor={`assign-${ticket.id}`}>Assign to</Label>
                  <select
                    id={`assign-${ticket.id}`}
                    name="assignee"
                    className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-ink"
                  >
                    {staffList.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.label}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="submit" variant="secondary" size="sm" disabled={pending}>
                  Assign
                </Button>
              </form>
            )}
            {ticket.status !== "resolved" && (
              <form action={formAction}>
                <input type="hidden" name="ticketId" value={ticket.id} />
                <Button
                  type="submit"
                  name="status"
                  value="resolved"
                  variant="secondary"
                  size="sm"
                  disabled={pending}
                >
                  Mark resolved
                </Button>
              </form>
            )}
            <form action={formAction}>
              <input type="hidden" name="ticketId" value={ticket.id} />
              <Button
                type="submit"
                name="status"
                value="closed"
                variant="danger"
                size="sm"
                disabled={pending}
              >
                Close ticket
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
