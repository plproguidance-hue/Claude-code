"use client";

import { useActionState } from "react";

import {
  addQuotationVersion,
  convertQuotationAction,
  sendQuotationAction,
  type BillingActionState,
} from "../../billing/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/input";

const initialState: BillingActionState = {};

export function QuoteBuilderControls({
  quoteId,
  status,
}: {
  quoteId: string;
  status: string;
}) {
  const [versionState, versionAction, versionPending] = useActionState(
    addQuotationVersion,
    initialState,
  );
  const [sendState, sendAction, sendPending] = useActionState(
    sendQuotationAction,
    initialState,
  );
  const [convertState, convertAction, convertPending] = useActionState(
    convertQuotationAction,
    initialState,
  );

  const editable = [
    "requested",
    "under_review",
    "draft",
    "changes_requested",
  ].includes(status);

  return (
    <div className="space-y-4">
      {editable && (
        <Card>
          <CardTitle>Add a version</CardTitle>
          <form action={versionAction} className="mt-3 space-y-3" noValidate>
            {versionState.error && (
              <Alert tone="error">{versionState.error}</Alert>
            )}
            {versionState.message && (
              <Alert tone="success">{versionState.message}</Alert>
            )}
            <input type="hidden" name="quoteId" value={quoteId} />
            <div>
              <Label htmlFor="qv-items">
                Line items — one per line: label | qty | USD price
              </Label>
              <textarea
                id="qv-items"
                name="items"
                rows={4}
                required
                placeholder={"USA LLC Formation | 1 | 199\nEIN Application | 1 | 79"}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 font-mono text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <Button
              type="submit"
              variant="secondary"
              disabled={versionPending}
            >
              {versionPending ? "Saving…" : "Save as new version"}
            </Button>
          </form>
        </Card>
      )}

      <Card className="border-primary/30 bg-primary/5">
        <CardTitle>Actions</CardTitle>
        {sendState.error && (
          <Alert tone="error" className="mt-3">
            {sendState.error}
          </Alert>
        )}
        {sendState.message && (
          <Alert tone="success" className="mt-3">
            {sendState.message}
          </Alert>
        )}
        {convertState.error && (
          <Alert tone="error" className="mt-3">
            {convertState.error}
          </Alert>
        )}
        {convertState.message && (
          <Alert tone="success" className="mt-3">
            {convertState.message}
          </Alert>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {editable && (
            <form action={sendAction}>
              <input type="hidden" name="quoteId" value={quoteId} />
              <Button type="submit" disabled={sendPending}>
                {sendPending ? "Sending…" : "Send to client"}
              </Button>
            </form>
          )}
          {status === "accepted" && (
            <form action={convertAction}>
              <input type="hidden" name="quoteId" value={quoteId} />
              <Button type="submit" disabled={convertPending}>
                {convertPending
                  ? "Converting…"
                  : "Convert to order + draft invoice"}
              </Button>
            </form>
          )}
        </div>
        <p className="mt-2 text-xs text-ink-muted">
          Conversion is transactional and idempotent: exactly one order in
          &quot;Order submitted&quot; and one draft invoice. It never sends
          the invoice or advances the project.
        </p>
      </Card>
    </div>
  );
}
