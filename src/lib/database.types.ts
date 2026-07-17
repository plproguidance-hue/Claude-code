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
        Update: { full_name?: string | null };
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
    };
    Enums: {
      app_role: Role;
      account_status: AccountStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
