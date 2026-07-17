import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { deleteDraft } from "../actions";
import {
  AddressesForm,
  BasicsForm,
  NamePurposeForm,
  OwnersStep,
  ReviewSubmit,
  TaxForm,
} from "./wizard-forms";

export const metadata: Metadata = { title: "Company onboarding" };

const STEP_TITLES = [
  "Entity & state",
  "Name & purpose",
  "Owners & members",
  "Addresses & registered agent",
  "EIN & tax",
  "Review & submit",
] as const;

export default async function CompanyWizardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const draftId = typeof params.draft === "string" ? params.draft : null;
  if (!draftId) redirect("/companies");

  const supabase = await createClient();
  const { data: draft } = await supabase
    .from("companies")
    .select("*")
    .eq("id", draftId)
    .eq("status", "draft")
    .maybeSingle();
  if (!draft) redirect("/companies");

  const requestedStep = Number(
    typeof params.step === "string" ? params.step : draft.wizard_step,
  );
  // Steps already reached stay accessible (back/forward); later steps don't.
  const step = Math.min(
    Number.isFinite(requestedStep) && requestedStep >= 1 ? requestedStep : 1,
    draft.wizard_step,
    6,
  );

  const [{ data: owners }, { data: addresses }] = await Promise.all([
    supabase
      .from("company_owners_members")
      .select("*")
      .eq("company_id", draft.id)
      .order("created_at"),
    supabase.from("company_addresses").select("*").eq("company_id", draft.id),
  ]);

  const business = (addresses ?? []).find((a) => a.kind === "business");
  const registered = (addresses ?? []).find((a) => a.kind === "registered");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          {draft.onboarding_mode === "formation"
            ? "New US formation"
            : "Existing company transfer"}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">
          {STEP_TITLES[step - 1]}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">
          Step {step} of 6 · progress is saved after every step, resume anytime
          from Companies.
        </p>
      </div>

      <nav aria-label="Wizard progress">
        <ol className="flex flex-wrap gap-2">
          {STEP_TITLES.map((title, index) => {
            const stepNumber = index + 1;
            const reachable = stepNumber <= draft.wizard_step;
            const current = stepNumber === step;
            const chip = (
              <span
                className={
                  current
                    ? "inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-white"
                    : reachable
                      ? "inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink"
                      : "inline-flex items-center rounded-full border border-line px-3 py-1 text-xs text-ink-muted/60"
                }
                aria-current={current ? "step" : undefined}
              >
                {stepNumber}. {title}
              </span>
            );
            return (
              <li key={title}>
                {reachable && !current ? (
                  <Link
                    href={`/companies/new?draft=${draft.id}&step=${stepNumber}`}
                  >
                    {chip}
                  </Link>
                ) : (
                  chip
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <Card>
        {step === 1 && <BasicsForm draft={draft} />}
        {step === 2 && <NamePurposeForm draft={draft} />}
        {step === 3 && <OwnersStep draft={draft} owners={owners ?? []} />}
        {step === 4 && (
          <AddressesForm
            draft={draft}
            business={business ?? null}
            registered={registered ?? null}
          />
        )}
        {step === 5 && <TaxForm draft={draft} />}
        {step === 6 && (
          <ReviewSubmit
            draft={draft}
            owners={owners ?? []}
            business={business ?? null}
            registered={registered ?? null}
          />
        )}
      </Card>

      <form action={deleteDraft} className="text-center">
        <input type="hidden" name="draftId" value={draft.id} />
        <button
          type="submit"
          className="text-sm text-ink-muted underline-offset-2 hover:text-danger hover:underline"
        >
          Discard this draft
        </button>
      </form>
    </div>
  );
}
