"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";

import type {
  CompanyAddressRow,
  CompanyOwnerRow,
  CompanyRow,
} from "@/lib/database.types";
import { US_JURISDICTIONS, jurisdictionName } from "@/config/us-states";
import { ENTITY_TYPE_LABELS, maskEin } from "@/lib/format";
import {
  addOwner,
  continueToAddresses,
  removeOwner,
  saveAddresses,
  saveBasics,
  saveNamePurpose,
  saveTax,
  submitCompany,
  type CompanyActionState,
} from "../actions";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

const initialState: CompanyActionState = {};

function StateSelect({
  id,
  name,
  defaultValue,
}: {
  id: string;
  name: string;
  defaultValue?: string | null;
}) {
  return (
    <select
      id={id}
      name={name}
      required
      defaultValue={defaultValue ?? ""}
      className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
    >
      <option value="" disabled>
        Select a state or territory…
      </option>
      {US_JURISDICTIONS.map((jurisdiction) => (
        <option key={jurisdiction.code} value={jurisdiction.code}>
          {jurisdiction.name}
        </option>
      ))}
    </select>
  );
}

export function BasicsForm({ draft }: { draft: CompanyRow }) {
  const [state, formAction, pending] = useActionState(saveBasics, initialState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="draftId" value={draft.id} />

      <div>
        <Label htmlFor="entityType">Entity type</Label>
        <select
          id="entityType"
          name="entityType"
          required
          defaultValue={draft.entity_type ?? ""}
          className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="" disabled>
            Select an entity type…
          </option>
          {Object.entries(ENTITY_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <p className="mt-1.5 text-xs text-ink-muted">
          ProGuidance provides processing support, not legal or tax advice —
          confirm suitability with your advisor where needed.
        </p>
      </div>

      <div>
        <Label htmlFor="formationState">
          {draft.onboarding_mode === "formation"
            ? "Formation state"
            : "State of formation"}
        </Label>
        <StateSelect
          id="formationState"
          name="formationState"
          defaultValue={draft.formation_state}
        />
      </div>

      {draft.onboarding_mode === "transfer" && (
        <div>
          <Label htmlFor="formationDate">Formation date</Label>
          <Input
            id="formationDate"
            name="formationDate"
            type="date"
            defaultValue={draft.formation_date ?? ""}
          />
        </div>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}

export function NamePurposeForm({ draft }: { draft: CompanyRow }) {
  const [state, formAction, pending] = useActionState(
    saveNamePurpose,
    initialState,
  );
  const pendingName = draft.legal_name.includes("(name pending)");
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="draftId" value={draft.id} />

      <div>
        <Label htmlFor="legalName">
          {draft.onboarding_mode === "formation"
            ? "Proposed legal name"
            : "Current legal name"}
        </Label>
        <Input
          id="legalName"
          name="legalName"
          required
          maxLength={200}
          defaultValue={pendingName ? "" : draft.legal_name}
          placeholder="Acme Ventures LLC"
        />
      </div>

      <div>
        <Label htmlFor="dba">DBA / trade name (optional)</Label>
        <Input
          id="dba"
          name="dba"
          maxLength={200}
          defaultValue={draft.dba ?? ""}
        />
      </div>

      <div>
        <Label htmlFor="businessPurpose">Business activity & purpose</Label>
        <textarea
          id="businessPurpose"
          name="businessPurpose"
          required
          rows={4}
          maxLength={2000}
          defaultValue={draft.business_purpose ?? ""}
          placeholder="What the company does, main products/services, target market…"
          className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}

export function OwnersStep({
  draft,
  owners,
}: {
  draft: CompanyRow;
  owners: CompanyOwnerRow[];
}) {
  const [state, formAction, pending] = useActionState(addOwner, initialState);
  return (
    <div className="space-y-6">
      {owners.length > 0 ? (
        <ul className="space-y-2">
          {owners.map((owner) => (
            <li
              key={owner.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2"
            >
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-ink">
                  {owner.full_name}
                  {owner.role_title ? ` · ${owner.role_title}` : ""}
                </p>
                <p className="text-xs text-ink-muted">
                  {owner.ownership_percent != null
                    ? `${owner.ownership_percent}% ownership`
                    : "Ownership not specified"}
                  {owner.country ? ` · ${owner.country}` : ""}
                </p>
              </div>
              <form action={removeOwner}>
                <input type="hidden" name="draftId" value={draft.id} />
                <input type="hidden" name="ownerId" value={owner.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${owner.full_name}`}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 aria-hidden className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-ink-muted">
          No owners added yet. Add every owner, member, or officer with their
          ownership percentage.
        </p>
      )}

      <form action={formAction} className="space-y-4" noValidate>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        {state.message && <Alert tone="success">{state.message}</Alert>}
        <input type="hidden" name="draftId" value={draft.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" required maxLength={120} />
          </div>
          <div>
            <Label htmlFor="roleTitle">Role / title</Label>
            <Input
              id="roleTitle"
              name="roleTitle"
              maxLength={120}
              placeholder="Managing Member"
            />
          </div>
          <div>
            <Label htmlFor="ownershipPercent">Ownership %</Label>
            <Input
              id="ownershipPercent"
              name="ownershipPercent"
              type="number"
              min={0}
              max={100}
              step="0.01"
            />
          </div>
          <div>
            <Label htmlFor="country">Country of residence</Label>
            <Input
              id="country"
              name="country"
              maxLength={60}
              placeholder="US, BD, AE…"
            />
            <p className="mt-1 text-xs text-ink-muted">
              Owners may live outside the United States.
            </p>
          </div>
        </div>
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "Adding…" : "Add owner"}
        </Button>
      </form>

      <form action={continueToAddresses}>
        <input type="hidden" name="draftId" value={draft.id} />
        <Button type="submit" disabled={owners.length === 0}>
          Continue
        </Button>
        {owners.length === 0 && (
          <p className="mt-1.5 text-xs text-ink-muted">
            Add at least one owner to continue.
          </p>
        )}
      </form>
    </div>
  );
}

function AddressFields({
  prefix,
  legend,
  defaults,
}: {
  prefix: string;
  legend: string;
  defaults: CompanyAddressRow | null;
}) {
  return (
    <fieldset className="space-y-4 rounded-lg border border-line p-4">
      <legend className="px-1 text-sm font-semibold text-ink">{legend}</legend>
      <div>
        <Label htmlFor={`${prefix}Line1`}>Street address</Label>
        <Input
          id={`${prefix}Line1`}
          name={`${prefix}Line1`}
          required
          defaultValue={defaults?.line1 ?? ""}
        />
      </div>
      <div>
        <Label htmlFor={`${prefix}Line2`}>Suite / unit (optional)</Label>
        <Input
          id={`${prefix}Line2`}
          name={`${prefix}Line2`}
          defaultValue={defaults?.line2 ?? ""}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor={`${prefix}City`}>City</Label>
          <Input
            id={`${prefix}City`}
            name={`${prefix}City`}
            required
            defaultValue={defaults?.city ?? ""}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}State`}>State</Label>
          <StateSelect
            id={`${prefix}State`}
            name={`${prefix}State`}
            defaultValue={defaults?.state}
          />
        </div>
        <div>
          <Label htmlFor={`${prefix}PostalCode`}>ZIP</Label>
          <Input
            id={`${prefix}PostalCode`}
            name={`${prefix}PostalCode`}
            required
            defaultValue={defaults?.postal_code ?? ""}
          />
        </div>
      </div>
      <p className="text-xs text-ink-muted">
        Company addresses are United States only.
      </p>
    </fieldset>
  );
}

export function AddressesForm({
  draft,
  business,
  registered,
}: {
  draft: CompanyRow;
  business: CompanyAddressRow | null;
  registered: CompanyAddressRow | null;
}) {
  const [state, formAction, pending] = useActionState(
    saveAddresses,
    initialState,
  );
  return (
    <form action={formAction} className="space-y-6" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="draftId" value={draft.id} />

      <AddressFields
        prefix="business"
        legend="Business address"
        defaults={business}
      />

      <div>
        <Label htmlFor="registeredAgentName">Registered agent name</Label>
        <Input
          id="registeredAgentName"
          name="registeredAgentName"
          required
          maxLength={200}
          defaultValue={draft.registered_agent_name ?? ""}
        />
      </div>

      <AddressFields
        prefix="registered"
        legend="Registered agent address"
        defaults={registered}
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}

export function TaxForm({ draft }: { draft: CompanyRow }) {
  const [state, formAction, pending] = useActionState(saveTax, initialState);
  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <input type="hidden" name="draftId" value={draft.id} />

      <div>
        <Label htmlFor="ein">EIN (optional)</Label>
        <Input
          id="ein"
          name="ein"
          placeholder="12-3456789"
          defaultValue={draft.ein ?? ""}
          className="tnum"
        />
        <p className="mt-1.5 text-xs text-ink-muted">
          {draft.onboarding_mode === "formation"
            ? "Leave blank if the company has no EIN yet — EIN application is available as a service."
            : "Enter the company's existing EIN if available. It is stored securely and masked by default."}
        </p>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save and continue"}
      </Button>
    </form>
  );
}

export function ReviewSubmit({
  draft,
  owners,
  business,
  registered,
}: {
  draft: CompanyRow;
  owners: CompanyOwnerRow[];
  business: CompanyAddressRow | null;
  registered: CompanyAddressRow | null;
}) {
  const [state, formAction, pending] = useActionState(
    submitCompany,
    initialState,
  );

  const rows: [string, string][] = [
    ["Legal name", draft.legal_name],
    ["DBA", draft.dba ?? "—"],
    [
      "Entity",
      draft.entity_type ? (ENTITY_TYPE_LABELS[draft.entity_type] ?? "—") : "—",
    ],
    [
      "State",
      draft.formation_state ? jurisdictionName(draft.formation_state) : "—",
    ],
    ["EIN", maskEin(draft.ein)],
    ["Registered agent", draft.registered_agent_name ?? "—"],
    [
      "Business address",
      business
        ? `${business.line1}, ${business.city}, ${business.state} ${business.postal_code}`
        : "—",
    ],
    [
      "Agent address",
      registered
        ? `${registered.line1}, ${registered.city}, ${registered.state} ${registered.postal_code}`
        : "—",
    ],
    [
      "Owners",
      owners.length > 0
        ? owners
            .map(
              (owner) =>
                `${owner.full_name}${
                  owner.ownership_percent != null
                    ? ` (${owner.ownership_percent}%)`
                    : ""
                }`,
            )
            .join(", ")
        : "—",
    ],
  ];

  return (
    <div className="space-y-6">
      <dl className="divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-3 gap-3 py-2.5 text-sm">
            <dt className="text-ink-muted">{label}</dt>
            <dd className="col-span-2 text-ink">{value}</dd>
          </div>
        ))}
      </dl>

      <form action={formAction} className="space-y-4">
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <input type="hidden" name="draftId" value={draft.id} />
        <label className="flex items-start gap-2 text-sm text-ink">
          <input type="checkbox" name="consent" className="mt-0.5" required />
          <span>
            I confirm the information above is accurate. I understand
            ProGuidance reviews every submission, that I can revise details
            before any authority submission, and that government, banking, and
            third-party decisions are outside ProGuidance&apos;s control.
          </span>
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit for review"}
        </Button>
      </form>
    </div>
  );
}
