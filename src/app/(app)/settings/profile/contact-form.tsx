"use client";

import { useActionState } from "react";

import type { ProfileRow } from "@/lib/database.types";
import { updateContactDetails, type ProfileActionState } from "./actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: ProfileActionState = {};

export function ContactForm({ profile }: { profile: ProfileRow }) {
  const [state, formAction, pending] = useActionState(
    updateContactDetails,
    initialState,
  );

  return (
    <form action={formAction} className="mt-4 space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      {state.message && <Alert tone="success">{state.message}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            name="phone"
            autoComplete="tel"
            defaultValue={profile.phone ?? ""}
            placeholder="+1 555 000 0000"
          />
        </div>
        <div>
          <Label htmlFor="timezone">Timezone</Label>
          <Input
            id="timezone"
            name="timezone"
            defaultValue={profile.timezone ?? ""}
            placeholder="America/New_York"
            list="timezone-options"
          />
          <datalist id="timezone-options">
            {typeof Intl.supportedValuesOf === "function" &&
              Intl.supportedValuesOf("timeZone").map((zone) => (
                <option key={zone} value={zone} />
              ))}
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="addressLine1">Address line 1</Label>
          <Input
            id="addressLine1"
            name="addressLine1"
            autoComplete="address-line1"
            defaultValue={profile.address_line1 ?? ""}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="addressLine2">Address line 2 (optional)</Label>
          <Input
            id="addressLine2"
            name="addressLine2"
            autoComplete="address-line2"
            defaultValue={profile.address_line2 ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            autoComplete="address-level2"
            defaultValue={profile.city ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="region">State / province / region</Label>
          <Input
            id="region"
            name="region"
            autoComplete="address-level1"
            defaultValue={profile.region ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="postalCode">Postal code</Label>
          <Input
            id="postalCode"
            name="postalCode"
            autoComplete="postal-code"
            defaultValue={profile.postal_code ?? ""}
          />
        </div>
        <div>
          <Label htmlFor="country">Country</Label>
          <Input
            id="country"
            name="country"
            autoComplete="country-name"
            defaultValue={profile.country ?? ""}
            placeholder="United States, Bangladesh, UAE…"
          />
          <p className="mt-1 text-xs text-ink-muted">
            Personal addresses may be anywhere in the world.
          </p>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save contact details"}
      </Button>
    </form>
  );
}
