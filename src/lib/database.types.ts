import type { AccountStatus, Role } from "@/lib/auth/permissions";
import type { ProjectStatus } from "@/lib/projects/status";

export type DataRequestStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected_changes_required"
  | "overdue"
  | "cancelled";

/**
 * Hand-maintained database typings for the Phase 1 schema
 * (supabase/migrations). Regenerate with `supabase gen types typescript`
 * once a local/hosted instance is available and replace this file.
 *
 * Everything here must stay `type` aliases (not `interface`): supabase-js
 * constrains rows to `Record<string, unknown>`, which interfaces fail for
 * lack of an implicit index signature.
 *
 * Insert/Update shapes describe what the API roles may attempt; Row Level
 * Security is the actual write authority (e.g. profile inserts only happen
 * via the signup trigger, audit_logs rejects all direct writes).
 */

export type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  status: AccountStatus;
  registration_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  phone: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationRow = {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrganizationMembershipRow = {
  id: string;
  organization_id: string;
  user_id: string;
  is_owner: boolean;
  created_at: string;
};

export type StaffAssignmentRow = {
  id: string;
  organization_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
};

export type CompanyStatus =
  | "draft"
  | "pending_review"
  | "active"
  | "inactive"
  | "dissolved";

export type EntityType =
  | "llc"
  | "c_corp"
  | "s_corp"
  | "nonprofit"
  | "partnership"
  | "sole_prop";

export type CompanyRow = {
  id: string;
  organization_id: string;
  legal_name: string;
  dba: string | null;
  entity_type: EntityType | null;
  formation_state: string | null;
  formation_date: string | null;
  ein: string | null;
  registered_agent_name: string | null;
  business_purpose: string | null;
  status: CompanyStatus;
  onboarding_mode: "formation" | "transfer";
  wizard_step: number;
  created_by: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyOwnerRow = {
  id: string;
  company_id: string;
  full_name: string;
  role_title: string | null;
  ownership_percent: number | null;
  email: string | null;
  country: string | null;
  created_at: string;
};

export type CompanyAddressRow = {
  id: string;
  company_id: string;
  kind: "registered" | "mailing" | "business";
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  created_at: string;
};

export type ComplianceDeadlineRow = {
  id: string;
  company_id: string;
  title: string;
  kind: "annual_report" | "registered_agent_renewal" | "tax_filing" | "other";
  due_date: string;
  notes: string | null;
  status: "upcoming" | "completed" | "overdue";
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyUpdateRequestRow = {
  id: string;
  company_id: string;
  requested_by: string;
  changes: Record<string, string>;
  evidence_note: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: Role;
  organization_id: string | null;
  token_hash: string;
  auto_approve: boolean;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  organization_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type ServiceCategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort: number;
};

export type ServiceRow = {
  id: string;
  category_id: string;
  name: string;
  slug: string;
  summary: string;
  description: string | null;
  price_cents: number;
  price_note: string | null;
  government_fee_note: string | null;
  turnaround: string | null;
  requirements: string | null;
  is_published: boolean;
  requires_price_verification: boolean;
  sort: number;
  created_at: string;
  updated_at: string;
};

export type ServicePlanRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_cents: number;
  billing_note: string | null;
  is_published: boolean;
  sort: number;
  created_at: string;
};

export type ServicePlanItemRow = {
  id: string;
  plan_id: string;
  label: string;
  included: boolean;
  sort: number;
};

export type ProjectRow = {
  id: string;
  organization_id: string;
  company_id: string | null;
  service_id: string;
  order_number: string;
  status: ProjectStatus;
  requested_by: string | null;
  client_note: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectAssignmentRow = {
  id: string;
  project_id: string;
  user_id: string;
  role_label: string;
  assigned_by: string | null;
  created_at: string;
};

export type ProjectMilestoneRow = {
  id: string;
  project_id: string;
  title: string;
  due_date: string | null;
  completed_at: string | null;
  sort: number;
  created_at: string;
};

export type ProjectStatusHistoryRow = {
  id: string;
  project_id: string;
  actor_id: string | null;
  from_status: ProjectStatus | null;
  to_status: ProjectStatus;
  note: string | null;
  client_visible: boolean;
  created_at: string;
};

export type ProjectStatusTransitionRow = {
  from_status: ProjectStatus;
  to_status: ProjectStatus;
};

export type DataRequestRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  company_id: string | null;
  title: string;
  description: string | null;
  kind: "information" | "document";
  priority: "low" | "normal" | "high" | "urgent";
  due_date: string | null;
  status: DataRequestStatus;
  rejection_reason: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DataRequestSubmissionRow = {
  id: string;
  request_id: string;
  submitted_by: string | null;
  body: string;
  version: number;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  organization_id: string | null;
  type:
    | "action_required"
    | "document"
    | "project"
    | "message"
    | "billing"
    | "quotation"
    | "support"
    | "compliance"
    | "security"
    | "announcement";
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type HelpCategoryRow = {
  id: string;
  name: string;
  slug: string;
  sort: number;
};

export type HelpArticleRow = {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  body: string;
  is_published: boolean;
  sort: number;
  updated_at: string;
};

export type PerkRow = {
  id: string;
  name: string;
  category: string;
  description: string;
  benefit: string | null;
  url: string | null;
  disclosure: string | null;
  is_published: boolean;
  sort: number;
};

export type EmailOutboxRow = {
  id: string;
  to_email: string;
  subject: string;
  body: string;
  status: "pending" | "sent" | "failed";
  attempts: number;
  last_error: string | null;
  idempotency_key: string | null;
  created_at: string;
  sent_at: string | null;
};

export type TicketStatus =
  | "open"
  | "assigned"
  | "waiting_client"
  | "waiting_staff"
  | "resolved"
  | "closed"
  | "reopened";

export type TicketRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  company_id: string | null;
  ticket_number: string;
  department:
    | "sales"
    | "order_support"
    | "documents"
    | "accounting_invoice"
    | "marketplace_support"
    | "technical_support"
    | "compliance_tax"
    | "general_support";
  subject: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: TicketStatus;
  created_by: string | null;
  assigned_to: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TicketMessageRow = {
  id: string;
  ticket_id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

export type ProjectMessageRow = {
  id: string;
  project_id: string;
  author_id: string | null;
  body: string;
  is_internal: boolean;
  created_at: string;
};

export type DocumentReviewStatus =
  | "quarantined"
  | "pending_review"
  | "approved"
  | "rejected";

export type ScanStatusValue = "pending" | "clean" | "infected" | "unavailable";

export type DocumentCategory =
  | "formation"
  | "identity"
  | "tax"
  | "banking"
  | "marketplace"
  | "approval_letter"
  | "certificate"
  | "other";

export type DocumentRow = {
  id: string;
  organization_id: string;
  company_id: string | null;
  project_id: string | null;
  data_request_id: string | null;
  title: string;
  category: DocumentCategory;
  visibility: "client" | "staff";
  review_status: DocumentReviewStatus;
  review_note: string | null;
  current_version: number;
  expires_at: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentVersionRow = {
  id: string;
  document_id: string;
  version: number;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  checksum_sha256: string;
  storage_path: string;
  scan_status: ScanStatusValue;
  scanned_at: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export type QuotationStatus =
  | "requested"
  | "under_review"
  | "draft"
  | "sent"
  | "viewed"
  | "changes_requested"
  | "accepted"
  | "declined"
  | "expired"
  | "converted";

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "refunded";

export type PaymentStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "reversed";

export type QuotationRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  company_id: string | null;
  quote_number: string;
  title: string;
  status: QuotationStatus;
  request_note: string | null;
  terms: string | null;
  valid_until: string | null;
  current_version: number;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotationVersionRow = {
  id: string;
  quotation_id: string;
  version: number;
  created_by: string | null;
  created_at: string;
};

export type QuotationLineItemRow = {
  id: string;
  quotation_version_id: string;
  label: string;
  quantity: number;
  unit_price_cents: number;
  is_government_fee: boolean;
  sort: number;
};

export type InvoiceRow = {
  id: string;
  organization_id: string;
  project_id: string | null;
  company_id: string | null;
  quotation_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string | null;
  due_date: string | null;
  total_cents: number;
  amount_paid_cents: number;
  notes: string | null;
  terms: string | null;
  issued_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceLineItemRow = {
  id: string;
  invoice_id: string;
  label: string;
  quantity: number;
  unit_price_cents: number;
  is_government_fee: boolean;
  sort: number;
};

export type PaymentRow = {
  id: string;
  organization_id: string;
  invoice_id: string | null;
  method: "bank_transfer" | "wise" | "manual" | "wallet_topup";
  amount_cents: number;
  reference: string | null;
  paid_date: string | null;
  note: string | null;
  status: PaymentStatus;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export type WalletAccountRow = {
  id: string;
  organization_id: string;
  balance_cents: number;
  created_at: string;
};

export type WalletLedgerEntryRow = {
  id: string;
  wallet_account_id: string;
  entry_type: "credit" | "debit";
  amount_cents: number;
  balance_after_cents: number;
  reference: string | null;
  related_invoice_id: string | null;
  related_payment_id: string | null;
  idempotency_key: string | null;
  actor_id: string | null;
  created_at: string;
};

export type DocumentReviewRow = {
  id: string;
  document_id: string;
  version: number;
  reviewer_id: string | null;
  decision: "approved" | "rejected" | "released" | "quarantine_rejected";
  note: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: { id: string; email: string; full_name?: string | null };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          address_line1?: string | null;
          address_line2?: string | null;
          city?: string | null;
          region?: string | null;
          postal_code?: string | null;
          country?: string | null;
          timezone?: string | null;
          // Privileged columns — the profiles_protect_columns trigger rejects
          // these unless the caller holds users.roles.manage / approval perms.
          role?: Role;
          status?: AccountStatus;
        };
        Relationships: [];
      };
      organizations: {
        Row: OrganizationRow;
        Insert: { name: string; slug: string; created_by?: string | null };
        Update: { name?: string; slug?: string };
        Relationships: [];
      };
      organization_memberships: {
        Row: OrganizationMembershipRow;
        Insert: {
          organization_id: string;
          user_id: string;
          is_owner?: boolean;
        };
        Update: { is_owner?: boolean };
        Relationships: [];
      };
      staff_assignments: {
        Row: StaffAssignmentRow;
        Insert: {
          organization_id: string;
          user_id: string;
          assigned_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      companies: {
        Row: CompanyRow;
        Insert: {
          id?: string;
          organization_id: string;
          legal_name: string;
          dba?: string | null;
          entity_type?: EntityType | null;
          formation_state?: string | null;
          formation_date?: string | null;
          ein?: string | null;
          registered_agent_name?: string | null;
          business_purpose?: string | null;
          onboarding_mode?: "formation" | "transfer";
          wizard_step?: number;
          created_by?: string | null;
        };
        Update: {
          legal_name?: string;
          dba?: string | null;
          entity_type?: EntityType | null;
          formation_state?: string | null;
          formation_date?: string | null;
          ein?: string | null;
          registered_agent_name?: string | null;
          business_purpose?: string | null;
          status?: CompanyStatus;
          wizard_step?: number;
        };
        Relationships: [];
      };
      company_owners_members: {
        Row: CompanyOwnerRow;
        Insert: {
          company_id: string;
          full_name: string;
          role_title?: string | null;
          ownership_percent?: number | null;
          email?: string | null;
          country?: string | null;
        };
        Update: {
          full_name?: string;
          role_title?: string | null;
          ownership_percent?: number | null;
          email?: string | null;
          country?: string | null;
        };
        Relationships: [];
      };
      company_addresses: {
        Row: CompanyAddressRow;
        Insert: {
          company_id: string;
          kind: "registered" | "mailing" | "business";
          line1: string;
          line2?: string | null;
          city: string;
          state: string;
          postal_code: string;
          country?: string;
        };
        Update: {
          line1?: string;
          line2?: string | null;
          city?: string;
          state?: string;
          postal_code?: string;
        };
        Relationships: [];
      };
      company_compliance_deadlines: {
        Row: ComplianceDeadlineRow;
        Insert: {
          company_id: string;
          title: string;
          kind: ComplianceDeadlineRow["kind"];
          due_date: string;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          title?: string;
          kind?: ComplianceDeadlineRow["kind"];
          due_date?: string;
          notes?: string | null;
          status?: ComplianceDeadlineRow["status"];
        };
        Relationships: [];
      };
      company_update_requests: {
        Row: CompanyUpdateRequestRow;
        Insert: {
          company_id: string;
          requested_by: string;
          changes: Record<string, string>;
          evidence_note?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      invitations: {
        Row: InvitationRow;
        Insert: {
          email: string;
          role?: Role;
          organization_id?: string | null;
          token_hash: string;
          auto_approve?: boolean;
          invited_by?: string | null;
          expires_at: string;
        };
        Update: { revoked_at?: string | null };
        Relationships: [];
      };
      service_categories: {
        Row: ServiceCategoryRow;
        Insert: { name: string; slug: string; sort?: number };
        Update: { name?: string; slug?: string; sort?: number };
        Relationships: [];
      };
      services: {
        Row: ServiceRow;
        Insert: {
          category_id: string;
          name: string;
          slug: string;
          summary: string;
          price_cents: number;
          price_note?: string | null;
          government_fee_note?: string | null;
          turnaround?: string | null;
          requirements?: string | null;
          is_published?: boolean;
          sort?: number;
        };
        Update: {
          name?: string;
          summary?: string;
          description?: string | null;
          price_cents?: number;
          price_note?: string | null;
          government_fee_note?: string | null;
          turnaround?: string | null;
          requirements?: string | null;
          is_published?: boolean;
          requires_price_verification?: boolean;
          sort?: number;
        };
        Relationships: [];
      };
      service_plans: {
        Row: ServicePlanRow;
        Insert: {
          name: string;
          slug: string;
          description?: string | null;
          price_cents: number;
          billing_note?: string | null;
          is_published?: boolean;
          sort?: number;
        };
        Update: {
          name?: string;
          description?: string | null;
          price_cents?: number;
          billing_note?: string | null;
          is_published?: boolean;
          sort?: number;
        };
        Relationships: [];
      };
      service_plan_items: {
        Row: ServicePlanItemRow;
        Insert: {
          plan_id: string;
          label: string;
          included?: boolean;
          sort?: number;
        };
        Update: { label?: string; included?: boolean; sort?: number };
        Relationships: [];
      };
      projects: {
        Row: ProjectRow;
        Insert: {
          organization_id: string;
          company_id?: string | null;
          service_id: string;
          requested_by?: string | null;
          client_note?: string | null;
        };
        Update: { client_note?: string | null };
        Relationships: [];
      };
      project_assignments: {
        Row: ProjectAssignmentRow;
        Insert: {
          project_id: string;
          user_id: string;
          role_label?: string;
          assigned_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      project_milestones: {
        Row: ProjectMilestoneRow;
        Insert: {
          project_id: string;
          title: string;
          due_date?: string | null;
          sort?: number;
        };
        Update: {
          title?: string;
          due_date?: string | null;
          completed_at?: string | null;
          sort?: number;
        };
        Relationships: [];
      };
      project_status_history: {
        Row: ProjectStatusHistoryRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      project_status_transitions: {
        Row: ProjectStatusTransitionRow;
        Insert: ProjectStatusTransitionRow;
        Update: Record<string, never>;
        Relationships: [];
      };
      data_requests: {
        Row: DataRequestRow;
        Insert: {
          organization_id: string;
          project_id?: string | null;
          company_id?: string | null;
          title: string;
          description?: string | null;
          kind?: "information" | "document";
          priority?: "low" | "normal" | "high" | "urgent";
          due_date?: string | null;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      data_request_submissions: {
        Row: DataRequestSubmissionRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      quotations: {
        Row: QuotationRow;
        Insert: {
          id?: string;
          organization_id: string;
          project_id?: string | null;
          company_id?: string | null;
          title: string;
          status?: QuotationStatus;
          request_note?: string | null;
          terms?: string | null;
          valid_until?: string | null;
          requested_by?: string | null;
          created_by?: string | null;
        };
        Update: {
          title?: string;
          terms?: string | null;
          valid_until?: string | null;
        };
        Relationships: [];
      };
      quotation_versions: {
        Row: QuotationVersionRow;
        Insert: {
          id?: string;
          quotation_id: string;
          version: number;
          created_by?: string | null;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      quotation_line_items: {
        Row: QuotationLineItemRow;
        Insert: {
          quotation_version_id: string;
          label: string;
          quantity?: number;
          unit_price_cents: number;
          is_government_fee?: boolean;
          sort?: number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      invoices: {
        Row: InvoiceRow;
        Insert: {
          id?: string;
          organization_id: string;
          project_id?: string | null;
          company_id?: string | null;
          notes?: string | null;
          terms?: string | null;
          created_by?: string | null;
        };
        Update: { notes?: string | null; terms?: string | null };
        Relationships: [];
      };
      invoice_line_items: {
        Row: InvoiceLineItemRow;
        Insert: {
          invoice_id: string;
          label: string;
          quantity?: number;
          unit_price_cents: number;
          is_government_fee?: boolean;
          sort?: number;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      payments: {
        Row: PaymentRow;
        Insert: {
          id?: string;
          organization_id: string;
          invoice_id?: string | null;
          method: PaymentRow["method"];
          amount_cents: number;
          reference?: string | null;
          paid_date?: string | null;
          note?: string | null;
          submitted_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      wallet_accounts: {
        Row: WalletAccountRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      wallet_ledger_entries: {
        Row: WalletLedgerEntryRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      notifications: {
        Row: NotificationRow;
        Insert: Record<string, never>;
        Update: { read_at?: string | null };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          user_id: string;
          category: string;
          email_enabled: boolean;
        };
        Insert: {
          user_id: string;
          category: string;
          email_enabled?: boolean;
        };
        Update: { email_enabled?: boolean };
        Relationships: [];
      };
      email_outbox: {
        Row: EmailOutboxRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      help_categories: {
        Row: HelpCategoryRow;
        Insert: { name: string; slug: string; sort?: number };
        Update: { name?: string; slug?: string; sort?: number };
        Relationships: [];
      };
      help_articles: {
        Row: HelpArticleRow;
        Insert: {
          category_id: string;
          title: string;
          slug: string;
          body: string;
          is_published?: boolean;
          sort?: number;
        };
        Update: {
          title?: string;
          body?: string;
          is_published?: boolean;
          sort?: number;
        };
        Relationships: [];
      };
      perks_resources: {
        Row: PerkRow;
        Insert: {
          name: string;
          category: string;
          description: string;
          benefit?: string | null;
          url?: string | null;
          disclosure?: string | null;
          is_published?: boolean;
          sort?: number;
        };
        Update: { is_published?: boolean; sort?: number };
        Relationships: [];
      };
      tickets: {
        Row: TicketRow;
        Insert: {
          organization_id: string;
          project_id?: string | null;
          company_id?: string | null;
          department: TicketRow["department"];
          subject: string;
          priority?: TicketRow["priority"];
          created_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      ticket_messages: {
        Row: TicketMessageRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
      project_messages: {
        Row: ProjectMessageRow;
        Insert: {
          project_id: string;
          author_id: string;
          body: string;
          is_internal?: boolean;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      documents: {
        Row: DocumentRow;
        Insert: {
          id?: string;
          organization_id: string;
          company_id?: string | null;
          project_id?: string | null;
          data_request_id?: string | null;
          title: string;
          category?: DocumentCategory;
          visibility?: "client" | "staff";
          expires_at?: string | null;
          uploaded_by: string;
        };
        Update: {
          title?: string;
          category?: DocumentCategory;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      document_versions: {
        Row: DocumentVersionRow;
        Insert: {
          document_id: string;
          version: number;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          checksum_sha256: string;
          storage_path: string;
          uploaded_by: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      document_reviews: {
        Row: DocumentReviewRow;
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      has_permission: {
        Args: { perm: string };
        Returns: boolean;
      };
      approve_registration: {
        Args: { target_user: string; decision: string; note?: string };
        Returns: undefined;
      };
      review_company_update_request: {
        Args: { request_id: string; decision: string; note?: string };
        Returns: undefined;
      };
      invitation_preview: {
        Args: { token: string };
        Returns: {
          email: string;
          invited_role: Role;
          organization_name: string | null;
          is_valid: boolean;
        }[];
      };
      transition_project: {
        Args: {
          p_project: string;
          new_status: ProjectStatus;
          note?: string;
          is_client_visible?: boolean;
        };
        Returns: undefined;
      };
      submit_data_request: {
        Args: { p_request: string; p_body: string };
        Returns: undefined;
      };
      review_data_request: {
        Args: { p_request: string; decision: string; note?: string };
        Returns: undefined;
      };
      mark_document_scanned: {
        Args: { p_version: string; result: ScanStatusValue };
        Returns: undefined;
      };
      release_quarantined_document: {
        Args: { p_document: string; decision: string; note?: string };
        Returns: undefined;
      };
      review_document: {
        Args: { p_document: string; decision: string; note?: string };
        Returns: undefined;
      };
      send_quotation: {
        Args: { p_quote: string };
        Returns: undefined;
      };
      decide_quotation: {
        Args: { p_quote: string; decision: string; note?: string };
        Returns: undefined;
      };
      convert_quotation: {
        Args: { p_quote: string };
        Returns: string;
      };
      issue_invoice: {
        Args: { p_invoice: string; p_due_date?: string };
        Returns: undefined;
      };
      review_payment: {
        Args: { p_payment: string; decision: string; note?: string };
        Returns: undefined;
      };
      reply_ticket: {
        Args: { p_ticket: string; p_body: string; p_internal?: boolean };
        Returns: undefined;
      };
      set_ticket_status: {
        Args: {
          p_ticket: string;
          new_status: TicketStatus;
          assignee?: string;
        };
        Returns: undefined;
      };
      send_org_announcement: {
        Args: {
          org: string;
          n_title: string;
          n_body?: string;
          n_link?: string;
        };
        Returns: undefined;
      };
    };
    Enums: {
      app_role: Role;
      account_status: AccountStatus;
      company_status: CompanyStatus;
      entity_type: EntityType;
      project_status: ProjectStatus;
      data_request_status: DataRequestStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
