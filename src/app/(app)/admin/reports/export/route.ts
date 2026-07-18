import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function csvEscape(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

/** Authorized invoice export (reports.view), audited via audit trigger-free
 *  explicit log; RLS scopes the rows to the caller. */
export async function GET() {
  const supabase = await createClient();
  const { data: canView } = await supabase.rpc("has_permission", {
    perm: "reports.view",
  });
  if (!canView) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: invoices } = await supabase
    .from("invoices")
    .select("*")
    .order("created_at", { ascending: false });

  const header = [
    "invoice_number",
    "status",
    "issue_date",
    "due_date",
    "total_usd",
    "paid_usd",
    "created_at",
  ].join(",");
  const rows = (invoices ?? []).map((invoice) =>
    [
      csvEscape(invoice.invoice_number),
      csvEscape(invoice.status),
      csvEscape(invoice.issue_date),
      csvEscape(invoice.due_date),
      csvEscape((invoice.total_cents / 100).toFixed(2)),
      csvEscape((invoice.amount_paid_cents / 100).toFixed(2)),
      csvEscape(invoice.created_at),
    ].join(","),
  );

  return new NextResponse([header, ...rows].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="proguidance-invoices.csv"',
    },
  });
}
