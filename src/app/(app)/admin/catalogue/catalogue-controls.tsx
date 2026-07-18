"use client";

import { useActionState } from "react";

import type { ServicePlanRow, ServiceRow } from "@/lib/database.types";
import {
  markPriceVerified,
  togglePlanPublished,
  toggleServicePublished,
  type CatalogueActionState,
} from "./actions";
import { Button } from "@/components/ui/button";

const initialState: CatalogueActionState = {};

export function CatalogueRowControls({ service }: { service: ServiceRow }) {
  const [publishState, publishAction, publishPending] = useActionState(
    toggleServicePublished,
    initialState,
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    markPriceVerified,
    initialState,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={publishAction}>
        <input type="hidden" name="serviceId" value={service.id} />
        <input
          type="hidden"
          name="publish"
          value={service.is_published ? "false" : "true"}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          disabled={publishPending}
        >
          {service.is_published ? "Unpublish" : "Publish"}
        </Button>
      </form>
      {service.requires_price_verification && (
        <form action={verifyAction}>
          <input type="hidden" name="serviceId" value={service.id} />
          <Button type="submit" size="sm" disabled={verifyPending}>
            Verify price
          </Button>
        </form>
      )}
      {(publishState.error ?? verifyState.error) && (
        <p role="alert" className="text-xs text-danger">
          {publishState.error ?? verifyState.error}
        </p>
      )}
    </div>
  );
}

export function PlanRowControls({ plan }: { plan: ServicePlanRow }) {
  const [state, formAction, pending] = useActionState(
    togglePlanPublished,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="planId" value={plan.id} />
      <input
        type="hidden"
        name="publish"
        value={plan.is_published ? "false" : "true"}
      />
      <Button type="submit" variant="secondary" size="sm" disabled={pending}>
        {plan.is_published ? "Unpublish" : "Publish"}
      </Button>
      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
