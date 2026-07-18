import type { BadgeTone } from "@/components/ui/badge";

export const QUOTATION_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  requested: { label: "Requested", tone: "info" },
  under_review: { label: "Under review", tone: "info" },
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Sent", tone: "brand" },
  viewed: { label: "Viewed", tone: "brand" },
  changes_requested: { label: "Changes requested", tone: "warning" },
  accepted: { label: "Accepted", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  converted: { label: "Converted", tone: "success" },
};

export const INVOICE_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  draft: { label: "Draft", tone: "neutral" },
  sent: { label: "Awaiting payment", tone: "warning" },
  viewed: { label: "Viewed", tone: "warning" },
  partially_paid: { label: "Partially paid", tone: "info" },
  paid: { label: "Paid", tone: "success" },
  overdue: { label: "Overdue", tone: "danger" },
  void: { label: "Void", tone: "neutral" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export const PAYMENT_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  submitted: { label: "Submitted", tone: "info" },
  under_review: { label: "Under review", tone: "info" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  reversed: { label: "Reversed", tone: "neutral" },
};

export const PAYMENT_METHODS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  wise: "Wise",
  manual: "Manual payment",
  wallet_topup: "Wallet top-up",
};

/** Parses "label | qty | price" lines into items; throws on bad lines. */
export function parseLineItems(
  raw: string,
): { label: string; quantity: number; unit_price_cents: number }[] {
  const items = raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [label, qty, price] = line.split("|").map((part) => part.trim());
      const quantity = Number(qty ?? "1");
      const dollars = Number(price);
      if (!label || !Number.isFinite(quantity) || quantity <= 0) {
        throw new Error(`Line ${index + 1}: use "label | qty | price"`);
      }
      if (!Number.isFinite(dollars) || dollars < 0) {
        throw new Error(`Line ${index + 1}: price must be a USD amount`);
      }
      return {
        label,
        quantity,
        unit_price_cents: Math.round(dollars * 100),
      };
    });
  if (items.length === 0) throw new Error("Add at least one line item.");
  return items;
}

export function lineTotalCents(items: { quantity: number; unit_price_cents: number }[]): number {
  return items.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unit_price_cents),
    0,
  );
}
