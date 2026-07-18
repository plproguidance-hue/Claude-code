/**
 * Project status machine — typed mirror of the seeded
 * `project_status_transitions` matrix (sync-tested against the migration).
 * The database (`transition_project()`) is the enforcement layer; this module
 * powers UI: labels, badge tones, action ownership, and progress heuristics.
 */

export const PROJECT_STATUSES = [
  "draft",
  "order_submitted",
  "payment_pending",
  "payment_confirmed",
  "information_required",
  "documents_under_review",
  "processing",
  "submitted_to_authority",
  "waiting_for_approval",
  "completed",
  "rejected_issue_found",
  "on_hold",
  "cancelled",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  draft: "Draft",
  order_submitted: "Order submitted",
  payment_pending: "Payment pending",
  payment_confirmed: "Payment confirmed",
  information_required: "Information required",
  documents_under_review: "Documents under review",
  processing: "Processing",
  submitted_to_authority: "Submitted to authority / platform",
  waiting_for_approval: "Waiting for approval",
  completed: "Completed",
  rejected_issue_found: "Rejected / issue found",
  on_hold: "On hold",
  cancelled: "Cancelled",
};

/** Who owns the next action in each status (spec §6.5). */
export const PROJECT_ACTION_OWNER: Record<
  ProjectStatus,
  "client" | "proguidance" | "authority" | "none"
> = {
  draft: "client",
  order_submitted: "proguidance",
  payment_pending: "client",
  payment_confirmed: "proguidance",
  information_required: "client",
  documents_under_review: "proguidance",
  processing: "proguidance",
  submitted_to_authority: "authority",
  waiting_for_approval: "authority",
  completed: "none",
  rejected_issue_found: "proguidance",
  on_hold: "proguidance",
  cancelled: "none",
};

export const ACTION_OWNER_LABELS: Record<
  (typeof PROJECT_ACTION_OWNER)[ProjectStatus],
  string
> = {
  client: "Your action",
  proguidance: "ProGuidance is working",
  authority: "With authority / platform",
  none: "No action needed",
};

/**
 * Default valid transitions — must stay identical to the SQL seed in
 * supabase/migrations/20260717120000_catalogue_projects.sql
 * (tests/unit/project-status-sync.test.ts enforces it).
 */
export const DEFAULT_TRANSITIONS: Record<
  ProjectStatus,
  readonly ProjectStatus[]
> = {
  draft: ["order_submitted", "cancelled"],
  order_submitted: [
    "payment_pending",
    "payment_confirmed",
    "information_required",
    "processing",
    "on_hold",
    "cancelled",
  ],
  payment_pending: ["payment_confirmed", "on_hold", "cancelled"],
  payment_confirmed: [
    "information_required",
    "processing",
    "on_hold",
    "cancelled",
  ],
  information_required: [
    "documents_under_review",
    "processing",
    "on_hold",
    "cancelled",
  ],
  documents_under_review: [
    "information_required",
    "processing",
    "on_hold",
    "cancelled",
  ],
  processing: [
    "submitted_to_authority",
    "information_required",
    "completed",
    "rejected_issue_found",
    "on_hold",
    "cancelled",
  ],
  submitted_to_authority: [
    "waiting_for_approval",
    "rejected_issue_found",
    "completed",
  ],
  waiting_for_approval: ["completed", "rejected_issue_found"],
  completed: [],
  rejected_issue_found: ["processing", "information_required", "cancelled"],
  on_hold: ["order_submitted", "payment_pending", "processing", "cancelled"],
  cancelled: [],
};

/** Rough forward-progress heuristic for progress bars (not a promise). */
export function progressPercent(status: ProjectStatus): number {
  const weights: Record<ProjectStatus, number> = {
    draft: 0,
    order_submitted: 10,
    payment_pending: 15,
    payment_confirmed: 25,
    information_required: 35,
    documents_under_review: 45,
    processing: 60,
    submitted_to_authority: 80,
    waiting_for_approval: 90,
    completed: 100,
    rejected_issue_found: 60,
    on_hold: 40,
    cancelled: 0,
  };
  return weights[status];
}

export const DATA_REQUEST_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  in_progress: "In progress",
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected_changes_required: "Changes required",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

/** Statuses in which a client may (re)submit a response. */
export const DATA_REQUEST_SUBMITTABLE = [
  "sent",
  "viewed",
  "in_progress",
  "rejected_changes_required",
] as const;
