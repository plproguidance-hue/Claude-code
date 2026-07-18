/** Formatting/masking helpers. Sensitive values are masked by default (spec §10). */

/**
 * Masks an EIN (`12-3456789`) to its last four digits: `••-•••6789`.
 * Unrecognized input masks fully rather than leaking.
 */
export function maskEin(ein: string | null | undefined): string {
  if (!ein) return "—";
  const match = /^(\d{2})-(\d{7})$/.exec(ein);
  if (!match || !match[2]) return "••-•••••••";
  return `••-•••${match[2].slice(3)}`;
}

export function formatDateUS(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** USD-only money formatting with tabular-friendly output (spec: USD only). */
export function formatUsd(cents: number, note?: string | null): string {
  const dollars = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: dollars % 1 === 0 ? 0 : 2,
  }).format(dollars);
  return note ? `${formatted}${note}` : formatted;
}

export const ENTITY_TYPE_LABELS: Record<string, string> = {
  llc: "LLC",
  c_corp: "C Corporation",
  s_corp: "S Corporation",
  nonprofit: "Nonprofit",
  partnership: "Partnership",
  sole_prop: "Sole Proprietorship",
};

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  active: "Active",
  inactive: "Inactive",
  dissolved: "Dissolved",
};
