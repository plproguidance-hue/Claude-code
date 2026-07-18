import { cn } from "@/lib/utils";
import type { AccountStatus, Role } from "@/lib/auth/permissions";

const tones = {
  neutral: "bg-line/60 text-graphite",
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-[#92600A]",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  brand: "bg-primary/10 text-primary-hover",
} as const;

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

const STATUS_TONE: Record<AccountStatus, BadgeTone> = {
  pending_approval: "warning",
  active: "success",
  rejected: "danger",
  suspended: "danger",
  deactivated: "neutral",
};

const STATUS_LABEL: Record<AccountStatus, string> = {
  pending_approval: "Pending approval",
  active: "Active",
  rejected: "Rejected",
  suspended: "Suspended",
  deactivated: "Deactivated",
};

export function AccountStatusBadge({ status }: { status: AccountStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

const COMPANY_STATUS_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  pending_review: "warning",
  active: "success",
  inactive: "neutral",
  dissolved: "danger",
};

const COMPANY_STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_review: "Pending review",
  active: "Active",
  inactive: "Inactive",
  dissolved: "Dissolved",
};

export function CompanyStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={COMPANY_STATUS_TONE[status] ?? "neutral"}>
      {COMPANY_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

import {
  DATA_REQUEST_STATUS_LABELS,
  PROJECT_STATUS_LABELS,
  type ProjectStatus,
} from "@/lib/projects/status";

const PROJECT_STATUS_TONE: Record<ProjectStatus, BadgeTone> = {
  draft: "neutral",
  order_submitted: "info",
  payment_pending: "warning",
  payment_confirmed: "info",
  information_required: "warning",
  documents_under_review: "info",
  processing: "brand",
  submitted_to_authority: "info",
  waiting_for_approval: "info",
  completed: "success",
  rejected_issue_found: "danger",
  on_hold: "neutral",
  cancelled: "neutral",
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <Badge tone={PROJECT_STATUS_TONE[status]}>
      {PROJECT_STATUS_LABELS[status]}
    </Badge>
  );
}

const DATA_REQUEST_TONE: Record<string, BadgeTone> = {
  draft: "neutral",
  sent: "info",
  viewed: "info",
  in_progress: "info",
  submitted: "brand",
  under_review: "brand",
  approved: "success",
  rejected_changes_required: "danger",
  overdue: "danger",
  cancelled: "neutral",
};

export function DataRequestStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={DATA_REQUEST_TONE[status] ?? "neutral"}>
      {DATA_REQUEST_STATUS_LABELS[status] ?? status}
    </Badge>
  );
}

const ROLE_LABEL: Record<Role, string> = {
  client: "Client",
  moderator: "Moderator",
  manager: "Manager",
  administrator: "Administrator",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge tone={role === "client" ? "neutral" : "brand"}>
      {ROLE_LABEL[role]}
    </Badge>
  );
}
