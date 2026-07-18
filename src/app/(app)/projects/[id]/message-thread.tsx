"use client";

import { useActionState } from "react";

import type { ProjectMessageRow } from "@/lib/database.types";
import { postProjectMessage, type MessageActionState } from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";

const initialState: MessageActionState = {};

export function MessageThread({
  projectId,
  messages,
  currentUserId,
  staff,
  staffNames,
}: {
  projectId: string;
  messages: ProjectMessageRow[];
  currentUserId: string;
  staff: boolean;
  staffNames: Record<string, string>;
}) {
  const [state, formAction, pending] = useActionState(
    postProjectMessage,
    initialState,
  );

  return (
    <div className="space-y-4">
      {messages.length > 0 ? (
        <ol className="space-y-3">
          {messages.map((message) => {
            const mine = message.author_id === currentUserId;
            const fromStaff = Boolean(staffNames[message.author_id ?? ""]);
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
                      ? `${staffNames[message.author_id ?? ""]} (ProGuidance)`
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
      ) : (
        <Card className="py-8 text-center">
          <p className="text-sm text-ink-muted">
            No messages yet — questions about this project go here.
          </p>
        </Card>
      )}

      <Card>
        <CardTitle>Post a message</CardTitle>
        <form action={formAction} className="mt-3 space-y-3" noValidate>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          {state.message && <Alert tone="success">{state.message}</Alert>}
          <input type="hidden" name="projectId" value={projectId} />
          <div>
            <Label htmlFor={`pm-body-${projectId}`} className="sr-only">
              Message
            </Label>
            <textarea
              id={`pm-body-${projectId}`}
              name="body"
              rows={3}
              required
              maxLength={10000}
              placeholder="Write a message to the project team…"
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
            {pending ? "Posting…" : "Post message"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
