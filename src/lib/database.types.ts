import type { AccountStatus, Role } from "@/lib/auth/permissions";

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
    };
    Enums: {
      app_role: Role;
      account_status: AccountStatus;
      company_status: CompanyStatus;
      entity_type: EntityType;
    };
    CompositeTypes: Record<string, never>;
  };
};
