import type { BadgeTone } from "@/components/ui/badge";

export const TICKET_DEPARTMENTS: Record<string, string> = {
  sales: "Sales",
  order_support: "Order Support",
  documents: "Documents",
  accounting_invoice: "Accounting / Invoice",
  marketplace_support: "Marketplace Support",
  technical_support: "Technical Support",
  compliance_tax: "Compliance / Tax",
  general_support: "General Support",
};

export const TICKET_STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  open: { label: "Open", tone: "info" },
  assigned: { label: "Assigned", tone: "brand" },
  waiting_client: { label: "Waiting for you", tone: "warning" },
  waiting_staff: { label: "Waiting for ProGuidance", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
  closed: { label: "Closed", tone: "neutral" },
  reopened: { label: "Reopened", tone: "warning" },
};
