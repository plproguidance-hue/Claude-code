"use client";

import { useActionState } from "react";

import type { PaymentRow } from "@/lib/database.types";
import {
  reviewPaymentAction,
  type BillingActionState,
} from "../../billing/actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PAYMENT_METHODS } from "@/lib/billing/labels";
import { formatDateUS, formatUsd } from "@/lib/format";

const initialState: BillingActionState = {};

export function PaymentReviewCard({
  payment,
  organizationName,
  invoiceNumber,
  canReview,
}: {
  payment: PaymentRow;
  organizationName: string;
  invoiceNumber: string | null;
  canReview: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    reviewPaymentAction,
    initialState,
  );

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="tnum">
            {formatUsd(payment.amount_cents)} —{" "}
            {PAYMENT_METHODS[payment.method] ?? payment.method}
          </CardTitle>
          <p className="mt-1 text-sm text-ink-muted tnum">
            {organizationName}
            {invoiceNumber ? ` · ${invoiceNumber}` : " · wallet top-up"}
            {payment.reference && ` · ref ${payment.reference}`}
            {payment.paid_date && ` · paid ${formatDateUS(payment.paid_date)}`}
          </p>
          {payment.note && (
            <p className="mt-1 text-sm text-ink-muted">
              Client note: {payment.note}
            </p>
          )}
        </div>
      </div>

      {state.error && (
        <Alert tone="error" className="mt-3">
          {state.error}
        </Alert>
      )}
      {state.message && (
        <Alert tone="success" className="mt-3">
          {state.message}
        </Alert>
      )}

      {canReview && !state.message && (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="paymentId" value={payment.id} />
          <div className="max-w-md">
            <Label htmlFor={`pr-note-${payment.id}`}>Note (optional)</Label>
            <Input id={`pr-note-${payment.id}`} name="note" maxLength={1000} />
          </div>
          <div className="flex gap-2">
            <Button
              type="submit"
              name="decision"
              value="approved"
              disabled={pending}
            >
              Approve
            </Button>
            <Button
              type="submit"
              name="decision"
              value="rejected"
              variant="danger"
              disabled={pending}
            >
              Reject
            </Button>
          </div>
        </form>
      )}
      {!canReview && (
        <p className="mt-3 text-xs text-ink-muted">
          Payment review is limited to administrators.
        </p>
      )}
    </Card>
  );
}
