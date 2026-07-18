-- ProGuidance Portal — combined schema for hosted Supabase (ALL PHASES)
-- Paste this entire file into the Supabase SQL Editor and run it once:
-- https://supabase.com/dashboard/project/nbeipbxdyyhzfbueovnq/sql/new
-- Generated from supabase/migrations/* (apply-once; not idempotent).


-- ============================================================
-- 20260717090000_foundation.sql
-- ============================================================
-- ProGuidance Portal — Phase 1 foundation
-- Identity, tenancy, roles, granular permissions, invitations, audit.
-- Design rationale: docs/04-data-model.md

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.app_role as enum (
  'client',
  'moderator',
  'manager',
  'administrator'
);

create type public.account_status as enum (
  'pending_approval',
  'active',
  'rejected',
  'suspended',
  'deactivated'
);

create type public.permission_effect as enum ('allow', 'deny');

-- ---------------------------------------------------------------------------
-- Utility triggers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role public.app_role not null default 'client',
  status public.account_status not null default 'pending_approval',
  registration_note text,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_status_idx on public.profiles (status);
create index profiles_email_lower_idx on public.profiles (lower(email));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_memberships_user_idx
  on public.organization_memberships (user_id);
create index organization_memberships_org_idx
  on public.organization_memberships (organization_id);

create table public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index staff_assignments_user_idx on public.staff_assignments (user_id);
create index staff_assignments_org_idx
  on public.staff_assignments (organization_id);

create table public.permissions (
  key text primary key check (key ~ '^[a-z_]+(\.[a-z_]+)+$'),
  description text not null,
  category text not null
);

create table public.role_permissions (
  role public.app_role not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  primary key (role, permission_key)
);

create table public.user_permission_overrides (
  user_id uuid not null references public.profiles (id) on delete cascade,
  permission_key text not null references public.permissions (key) on delete cascade,
  effect public.permission_effect not null,
  reason text,
  granted_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, permission_key)
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role public.app_role not null default 'client',
  organization_id uuid references public.organizations (id) on delete cascade,
  -- Only a hash of the invitation token is stored; the raw token is shown
  -- once at creation time and travels only in the invitation link.
  token_hash text not null unique,
  auto_approve boolean not null default false,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index invitations_email_lower_idx on public.invitations (lower(email));

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid,
  organization_id uuid,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id);
create index audit_logs_org_idx on public.audit_logs (organization_id);
create index audit_logs_entity_idx
  on public.audit_logs (entity_type, entity_id);

create table public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Audit helper (SECURITY DEFINER: the only write path into audit_logs)
-- ---------------------------------------------------------------------------

create or replace function public.log_audit_event(
  actor uuid,
  org uuid,
  action text,
  entity_type text,
  entity_id text,
  metadata jsonb default '{}'::jsonb
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.audit_logs
    (actor_id, organization_id, action, entity_type, entity_id, metadata)
  values (actor, org, action, entity_type, entity_id, coalesce(metadata, '{}'::jsonb));
$$;

-- ---------------------------------------------------------------------------
-- Authorization helpers
-- All SECURITY DEFINER with empty search_path: they read tables with RLS
-- bypassed (definer = table owner) precisely so RLS policies can call them
-- without recursion. They are STABLE and rely only on auth.uid().
-- ---------------------------------------------------------------------------

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid() and p.status = 'active'
  );
$$;

create or replace function public.is_administrator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.status = 'active'
       and p.role = 'administrator'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
     where p.id = auth.uid()
       and p.status = 'active'
       and p.role in ('administrator', 'manager', 'moderator')
  );
$$;

create or replace function public.is_org_member(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_active_user() and exists (
    select 1 from public.organization_memberships m
     where m.organization_id = org and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_assigned_staff(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_staff() and exists (
    select 1 from public.staff_assignments s
     where s.organization_id = org and s.user_id = auth.uid()
  );
$$;

-- Single tenancy gate reused by every module's policies (now and in later
-- phases): administrators see all, clients see their organizations, other
-- staff see assigned organizations. Inactive accounts see nothing.
create or replace function public.can_access_org(org uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_administrator()
      or public.is_org_member(org)
      or public.is_assigned_staff(org);
$$;

create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles p
     where p.id = auth.uid()
       and p.status = 'active'
       and (
         exists (
           select 1 from public.user_permission_overrides o
            where o.user_id = p.id
              and o.permission_key = perm
              and o.effect = 'allow'
         )
         or (
           exists (
             select 1 from public.role_permissions rp
              where rp.role = p.role and rp.permission_key = perm
           )
           and not exists (
             select 1 from public.user_permission_overrides o
              where o.user_id = p.id
                and o.permission_key = perm
                and o.effect = 'deny'
           )
         )
       )
  );
$$;

-- ---------------------------------------------------------------------------
-- Profile protection: end users may not touch identity/lifecycle columns.
-- Contexts without an end-user JWT (migrations, service role, auth triggers)
-- are exempt — they are already privileged.
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.id is distinct from old.id then
    raise exception 'profile id is immutable' using errcode = '42501';
  end if;

  if new.email is distinct from old.email
     and not public.has_permission('users.roles.manage') then
    raise exception 'email changes must flow through auth verification'
      using errcode = '42501';
  end if;

  if new.role is distinct from old.role
     and not public.has_permission('users.roles.manage') then
    raise exception 'permission denied: users.roles.manage required to change roles'
      using errcode = '42501';
  end if;

  if (new.status is distinct from old.status
      or new.decided_by is distinct from old.decided_by
      or new.decided_at is distinct from old.decided_at
      or new.decision_note is distinct from old.decision_note)
     and not (public.has_permission('clients.approve_registration')
              or public.has_permission('users.roles.manage')) then
    raise exception 'permission denied: account lifecycle changes require approval permission'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger profiles_protect_columns
  before update on public.profiles
  for each row execute function public.protect_profile_columns();

create or replace function public.audit_profile_role_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    perform public.log_audit_event(
      auth.uid(), null, 'user.role_changed', 'profile', new.id::text,
      jsonb_build_object('old_role', old.role, 'new_role', new.role)
    );
  end if;
  return new;
end;
$$;

create trigger profiles_audit_role_changes
  after update on public.profiles
  for each row execute function public.audit_profile_role_changes();

-- ---------------------------------------------------------------------------
-- Registration lifecycle
-- ---------------------------------------------------------------------------

-- Every new auth user gets a profile. Public self-registration lands in
-- 'pending_approval' with no data access; a matching un-expired invitation
-- may pre-assign role/organization and (per invitation policy) pre-approve.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invitations%rowtype;
  new_status public.account_status;
begin
  select i.* into inv
    from public.invitations i
   where lower(i.email) = lower(new.email)
     and i.revoked_at is null
     and i.accepted_at is null
     and i.expires_at > now()
   order by i.created_at desc
   limit 1;

  new_status := case
    when inv.id is not null and inv.auto_approve
      then 'active'::public.account_status
    else 'pending_approval'::public.account_status
  end;

  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    coalesce(inv.role, 'client'::public.app_role),
    new_status
  );

  if inv.id is not null then
    update public.invitations set accepted_at = now() where id = inv.id;

    if inv.organization_id is not null
       and coalesce(inv.role, 'client'::public.app_role) = 'client' then
      insert into public.organization_memberships (organization_id, user_id)
      values (inv.organization_id, new.id)
      on conflict do nothing;
    end if;

    perform public.log_audit_event(
      new.id, inv.organization_id, 'invitation.accepted', 'invitation',
      inv.id::text, jsonb_build_object('auto_approve', inv.auto_approve)
    );
  end if;

  perform public.log_audit_event(
    new.id, null, 'registration.submitted', 'profile', new.id::text,
    jsonb_build_object('status', new_status)
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Approve or reject a pending registration. Runs under the caller's session:
-- the permission check inside makes it safe to expose as an RPC, and the
-- decision + audit row commit atomically.
create or replace function public.approve_registration(
  target_user uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  target public.profiles%rowtype;
begin
  if not public.has_permission('clients.approve_registration') then
    raise exception 'permission denied: clients.approve_registration required'
      using errcode = '42501';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'invalid decision "%": expected approved or rejected', decision;
  end if;

  select p.* into target
    from public.profiles p
   where p.id = target_user
   for update;

  if not found then
    raise exception 'profile % not found', target_user;
  end if;

  if target.status <> 'pending_approval' then
    raise exception 'registration already decided (current status: %)', target.status;
  end if;

  update public.profiles
     set status = case when decision = 'approved'
                       then 'active'::public.account_status
                       else 'rejected'::public.account_status end,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = note
   where id = target_user;

  perform public.log_audit_event(
    auth.uid(), null,
    case when decision = 'approved'
         then 'registration.approved'
         else 'registration.rejected' end,
    'profile', target_user::text,
    jsonb_build_object('note', note)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Membership / assignment / override audit trail
-- ---------------------------------------------------------------------------

create or replace function public.audit_membership_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit_event(
      auth.uid(), new.organization_id, tg_table_name || '.added',
      tg_table_name, new.id::text,
      jsonb_build_object('user_id', new.user_id)
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform public.log_audit_event(
      auth.uid(), old.organization_id, tg_table_name || '.removed',
      tg_table_name, old.id::text,
      jsonb_build_object('user_id', old.user_id)
    );
    return old;
  end if;
  return new;
end;
$$;

create trigger organization_memberships_audit
  after insert or delete on public.organization_memberships
  for each row execute function public.audit_membership_changes();

create trigger staff_assignments_audit
  after insert or delete on public.staff_assignments
  for each row execute function public.audit_membership_changes();

create or replace function public.audit_override_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.log_audit_event(
      auth.uid(), null, 'permission_override.removed', 'user_permission_override',
      old.user_id::text || ':' || old.permission_key,
      jsonb_build_object('effect', old.effect)
    );
    return old;
  end if;
  perform public.log_audit_event(
    auth.uid(), null, 'permission_override.' || lower(tg_op),
    'user_permission_override',
    new.user_id::text || ':' || new.permission_key,
    jsonb_build_object('effect', new.effect, 'reason', new.reason)
  );
  return new;
end;
$$;

create trigger user_permission_overrides_audit
  after insert or update or delete on public.user_permission_overrides
  for each row execute function public.audit_override_changes();

-- ---------------------------------------------------------------------------
-- Private storage foundation (executed only where the storage schema exists,
-- i.e. on Supabase; plain-Postgres test databases skip it). No storage
-- policies are created yet — a private bucket with no policies is
-- default-deny. Phase 4 (document vault) adds the authorized access paths.
-- ---------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public)
    values ('documents', 'documents', false)
    on conflict (id) do nothing;
  end if;
end;
$$;

-- ============================================================
-- 20260717090100_rls.sql
-- ============================================================
-- ProGuidance Portal — Phase 1 Row Level Security
-- Default deny everywhere: RLS is enabled on every table and only the
-- policies below open access. `anon` has no policies at all.
-- Policy matrix rationale: docs/04-data-model.md

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.permissions enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_permission_overrides enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.system_settings enable row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create policy "profiles: own row"
  on public.profiles for select
  to authenticated
  using (id = (select auth.uid()));

create policy "profiles: administrators view all"
  on public.profiles for select
  to authenticated
  using ((select public.is_administrator()));

-- Assigned staff see profiles of members of organizations they are
-- assigned to (spec: managers/moderators access assigned clients).
create policy "profiles: assigned staff view members"
  on public.profiles for select
  to authenticated
  using (
    public.has_permission('clients.view_assigned')
    and exists (
      select 1
        from public.organization_memberships m
        join public.staff_assignments s
          on s.organization_id = m.organization_id
       where m.user_id = profiles.id
         and s.user_id = (select auth.uid())
    )
  );

-- Column-level protection (role/status/email) is enforced by the
-- profiles_protect_columns trigger; the policy governs row reach.
create policy "profiles: update own or with clients.update"
  on public.profiles for update
  to authenticated
  using (
    id = (select auth.uid())
    or public.has_permission('clients.update')
  )
  with check (
    id = (select auth.uid())
    or public.has_permission('clients.update')
  );

-- ---------------------------------------------------------------------------
-- organizations
-- ---------------------------------------------------------------------------

create policy "organizations: members, assigned staff, administrators"
  on public.organizations for select
  to authenticated
  using (public.can_access_org(id));

create policy "organizations: create with clients.create"
  on public.organizations for insert
  to authenticated
  with check (public.has_permission('clients.create'));

create policy "organizations: update with clients.update"
  on public.organizations for update
  to authenticated
  using (public.has_permission('clients.update'))
  with check (public.has_permission('clients.update'));

-- ---------------------------------------------------------------------------
-- organization_memberships
-- ---------------------------------------------------------------------------

create policy "memberships: visible within accessible orgs"
  on public.organization_memberships for select
  to authenticated
  using (public.can_access_org(organization_id));

create policy "memberships: manage with users.roles.manage"
  on public.organization_memberships for insert
  to authenticated
  with check (public.has_permission('users.roles.manage'));

create policy "memberships: update with users.roles.manage"
  on public.organization_memberships for update
  to authenticated
  using (public.has_permission('users.roles.manage'))
  with check (public.has_permission('users.roles.manage'));

create policy "memberships: delete with users.roles.manage"
  on public.organization_memberships for delete
  to authenticated
  using (public.has_permission('users.roles.manage'));

-- ---------------------------------------------------------------------------
-- staff_assignments
-- ---------------------------------------------------------------------------

create policy "staff_assignments: own rows or administrators"
  on public.staff_assignments for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_administrator())
  );

create policy "staff_assignments: manage with users.roles.manage"
  on public.staff_assignments for insert
  to authenticated
  with check (public.has_permission('users.roles.manage'));

create policy "staff_assignments: update with users.roles.manage"
  on public.staff_assignments for update
  to authenticated
  using (public.has_permission('users.roles.manage'))
  with check (public.has_permission('users.roles.manage'));

create policy "staff_assignments: delete with users.roles.manage"
  on public.staff_assignments for delete
  to authenticated
  using (public.has_permission('users.roles.manage'));

-- ---------------------------------------------------------------------------
-- permissions / role_permissions (catalogue: readable, never client-writable)
-- ---------------------------------------------------------------------------

create policy "permissions: readable by authenticated"
  on public.permissions for select
  to authenticated
  using (true);

create policy "role_permissions: readable by authenticated"
  on public.role_permissions for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- user_permission_overrides
-- ---------------------------------------------------------------------------

create policy "overrides: own or administrators"
  on public.user_permission_overrides for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_administrator())
  );

create policy "overrides: manage with users.roles.manage"
  on public.user_permission_overrides for insert
  to authenticated
  with check (public.has_permission('users.roles.manage'));

create policy "overrides: update with users.roles.manage"
  on public.user_permission_overrides for update
  to authenticated
  using (public.has_permission('users.roles.manage'))
  with check (public.has_permission('users.roles.manage'));

create policy "overrides: delete with users.roles.manage"
  on public.user_permission_overrides for delete
  to authenticated
  using (public.has_permission('users.roles.manage'));

-- ---------------------------------------------------------------------------
-- invitations (issuance/approval staff only; acceptance is server-side by
-- token hash, never by listing)
-- ---------------------------------------------------------------------------

create policy "invitations: view with invite permissions"
  on public.invitations for select
  to authenticated
  using (
    public.has_permission('clients.create')
    or public.has_permission('invitations.approve')
  );

create policy "invitations: create with clients.create"
  on public.invitations for insert
  to authenticated
  with check (
    public.has_permission('clients.create')
    and invited_by = (select auth.uid())
  );

create policy "invitations: update with invitations.approve"
  on public.invitations for update
  to authenticated
  using (public.has_permission('invitations.approve'))
  with check (public.has_permission('invitations.approve'));

-- ---------------------------------------------------------------------------
-- audit_logs — append-only, written exclusively via log_audit_event().
-- No insert/update/delete policies; grants revoked as a second layer.
-- ---------------------------------------------------------------------------

create policy "audit_logs: view with audit.view"
  on public.audit_logs for select
  to authenticated
  using (public.has_permission('audit.view'));

revoke insert, update, delete on public.audit_logs from authenticated;
revoke insert, update, delete on public.audit_logs from anon;

-- ---------------------------------------------------------------------------
-- system_settings (non-secret business configuration)
-- ---------------------------------------------------------------------------

create policy "system_settings: readable by authenticated"
  on public.system_settings for select
  to authenticated
  using (true);

create policy "system_settings: insert with settings.manage"
  on public.system_settings for insert
  to authenticated
  with check (public.has_permission('settings.manage'));

create policy "system_settings: update with settings.manage"
  on public.system_settings for update
  to authenticated
  using (public.has_permission('settings.manage'))
  with check (public.has_permission('settings.manage'));

create policy "system_settings: delete with settings.manage"
  on public.system_settings for delete
  to authenticated
  using (public.has_permission('settings.manage'));

-- ============================================================
-- 20260717090200_seed_permissions.sql
-- ============================================================
-- ProGuidance Portal — permission catalogue and default role grants.
-- Mirrored 1:1 by src/lib/auth/permissions.ts; the sync unit test
-- (tests/unit/role-permissions-sync.test.ts) fails if the two diverge.
-- Matrix rationale: docs/05-role-permission-matrix.md

insert into public.permissions (key, description, category) values
  ('clients.view_assigned', 'View clients assigned to the staff member', 'clients'),
  ('clients.view_all', 'View every client account', 'clients'),
  ('clients.create', 'Create client accounts and invitations', 'clients'),
  ('clients.update', 'Update client account details', 'clients'),
  ('clients.approve_registration', 'Approve or reject pending registrations', 'clients'),
  ('invitations.approve', 'Approve invitation issuance and acceptance', 'clients'),
  ('companies.view', 'View company records', 'companies'),
  ('companies.update_request_review', 'Review company data update requests', 'companies'),
  ('services.manage', 'Manage service catalogue, plans, and fees', 'services'),
  ('projects.create', 'Create projects/orders', 'projects'),
  ('projects.assign', 'Assign staff to projects', 'projects'),
  ('projects.transition', 'Move projects through allowed workflow stages', 'projects'),
  ('projects.complete', 'Complete projects', 'projects'),
  ('requests.create', 'Create data/document requests', 'projects'),
  ('requests.review', 'Review data-request submissions', 'projects'),
  ('documents.upload', 'Upload documents', 'documents'),
  ('documents.review', 'Approve or reject documents', 'documents'),
  ('documents.delete_metadata', 'Delete document metadata records', 'documents'),
  ('quotations.create', 'Draft quotations', 'billing'),
  ('quotations.send', 'Send quotations to clients', 'billing'),
  ('quotations.convert', 'Convert accepted quotations to orders', 'billing'),
  ('invoices.create', 'Create draft invoices', 'billing'),
  ('invoices.issue', 'Issue invoices to clients', 'billing'),
  ('payments.review', 'Review and approve payment proofs', 'billing'),
  ('refunds.manage', 'Manage refunds and credit notes', 'billing'),
  ('tickets.reply', 'Reply to support tickets', 'communication'),
  ('tickets.assign', 'Assign support tickets', 'communication'),
  ('tickets.close', 'Close support tickets', 'communication'),
  ('notifications.send', 'Compose and send notifications', 'communication'),
  ('content.manage', 'Manage Help Center and perks content', 'platform'),
  ('users.roles.manage', 'Manage user roles, memberships, and overrides', 'platform'),
  ('settings.manage', 'Manage business configuration and integrations', 'platform'),
  ('audit.view', 'View the audit log', 'platform'),
  ('reports.view', 'View operational and financial reports', 'platform');

-- Client: tenancy-scoped basics (RLS constrains all of these to the
-- client's own organizations).
insert into public.role_permissions (role, permission_key) values
  ('client', 'companies.view'),
  ('client', 'documents.upload'),
  ('client', 'tickets.reply');

-- Moderator: assigned queues only.
insert into public.role_permissions (role, permission_key) values
  ('moderator', 'clients.view_assigned'),
  ('moderator', 'companies.view'),
  ('moderator', 'projects.transition'),
  ('moderator', 'requests.create'),
  ('moderator', 'documents.upload'),
  ('moderator', 'tickets.reply');

-- Manager: operational management for assigned scope; financial issuance
-- and platform administration remain administrator-only.
insert into public.role_permissions (role, permission_key) values
  ('manager', 'clients.view_assigned'),
  ('manager', 'clients.update'),
  ('manager', 'companies.view'),
  ('manager', 'companies.update_request_review'),
  ('manager', 'projects.create'),
  ('manager', 'projects.assign'),
  ('manager', 'projects.transition'),
  ('manager', 'projects.complete'),
  ('manager', 'requests.create'),
  ('manager', 'requests.review'),
  ('manager', 'documents.upload'),
  ('manager', 'documents.review'),
  ('manager', 'quotations.create'),
  ('manager', 'quotations.send'),
  ('manager', 'quotations.convert'),
  ('manager', 'invoices.create'),
  ('manager', 'tickets.reply'),
  ('manager', 'tickets.assign'),
  ('manager', 'tickets.close'),
  ('manager', 'reports.view');

-- Administrator: full system access (every permission, current and future
-- rows in this catalogue seeding).
insert into public.role_permissions (role, permission_key)
select 'administrator'::public.app_role, p.key
  from public.permissions p;

-- ============================================================
-- 20260717110000_companies.sql
-- ============================================================
-- ProGuidance Portal — Phase 2: companies, compliance, update requests,
-- invitation preview, extended profile contact fields.
-- Design: docs/04-data-model.md (Phase 2 section), spec §6.2–§6.3.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.company_status as enum (
  'draft',           -- wizard in progress, editable by the client
  'pending_review',  -- submitted; ProGuidance reviews before activation
  'active',
  'inactive',
  'dissolved'
);

create type public.entity_type as enum (
  'llc',
  'c_corp',
  's_corp',
  'nonprofit',
  'partnership',
  'sole_prop'
);

create type public.update_request_status as enum (
  'pending',
  'approved',
  'rejected'
);

-- ---------------------------------------------------------------------------
-- Extended profile contact fields (personal addresses may be international,
-- spec §6.13; company/business addresses below remain USA-only).
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column phone text,
  add column address_line1 text,
  add column address_line2 text,
  add column city text,
  add column region text,
  add column postal_code text,
  add column country text,
  add column timezone text;

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  legal_name text not null check (char_length(legal_name) between 1 and 200),
  dba text,
  entity_type public.entity_type,
  formation_state text check (formation_state ~ '^[A-Z]{2}$'),
  formation_date date,
  ein text check (ein is null or ein ~ '^\d{2}-\d{7}$'),
  registered_agent_name text,
  business_purpose text,
  status public.company_status not null default 'draft',
  onboarding_mode text not null default 'formation'
    check (onboarding_mode in ('formation', 'transfer')),
  wizard_step integer not null default 1 check (wizard_step between 1 and 6),
  created_by uuid references auth.users (id) on delete set null,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index companies_org_idx on public.companies (organization_id);
create index companies_status_idx on public.companies (status);

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create table public.company_owners_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 120),
  role_title text,
  ownership_percent numeric(5, 2)
    check (ownership_percent is null
           or (ownership_percent >= 0 and ownership_percent <= 100)),
  email text,
  -- Owners/members may reside outside the United States (spec §3).
  country text,
  created_at timestamptz not null default now()
);

create index company_owners_company_idx
  on public.company_owners_members (company_id);

create table public.company_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind text not null check (kind in ('registered', 'mailing', 'business')),
  line1 text not null,
  line2 text,
  city text not null,
  state text not null check (state ~ '^[A-Z]{2}$'),
  postal_code text not null,
  -- Company jurisdiction/business addresses are USA-only (spec §3).
  country text not null default 'USA' check (country = 'USA'),
  created_at timestamptz not null default now(),
  unique (company_id, kind)
);

create index company_addresses_company_idx
  on public.company_addresses (company_id);

create table public.company_compliance_deadlines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  kind text not null check (kind in
    ('annual_report', 'registered_agent_renewal', 'tax_filing', 'other')),
  due_date date not null,
  notes text,
  status text not null default 'upcoming'
    check (status in ('upcoming', 'completed', 'overdue')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index compliance_deadlines_company_due_idx
  on public.company_compliance_deadlines (company_id, due_date);

create trigger compliance_deadlines_set_updated_at
  before update on public.company_compliance_deadlines
  for each row execute function public.set_updated_at();

-- Clients cannot silently edit authoritative filing data (spec §6.2): after
-- submission every change is a reviewed update request.
create table public.company_update_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  requested_by uuid not null references auth.users (id) on delete cascade,
  changes jsonb not null,
  evidence_note text,
  status public.update_request_status not null default 'pending',
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index company_update_requests_company_idx
  on public.company_update_requests (company_id);
create index company_update_requests_status_idx
  on public.company_update_requests (status);

-- ---------------------------------------------------------------------------
-- Access helpers
-- ---------------------------------------------------------------------------

create or replace function public.can_access_company(company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companies c
     where c.id = company
       and public.can_access_org(c.organization_id)
  );
$$;

-- Draft companies are directly editable by their organization's members;
-- everything later is staff territory.
create or replace function public.can_edit_company_children(company uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.companies c
     where c.id = company
       and (
         (public.is_org_member(c.organization_id) and c.status = 'draft')
         or (public.can_access_org(c.organization_id)
             and public.has_permission('companies.update_request_review'))
       )
  );
$$;

-- ---------------------------------------------------------------------------
-- Company column/transition protection
-- ---------------------------------------------------------------------------

create or replace function public.protect_company_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'companies cannot move between organizations'
      using errcode = '42501';
  end if;

  if new.status is distinct from old.status
     and not public.has_permission('companies.update_request_review') then
    -- Clients may only submit their draft for review.
    if not (old.status = 'draft' and new.status = 'pending_review') then
      raise exception 'permission denied: company status is managed by staff'
        using errcode = '42501';
    end if;
    new.submitted_at := now();
  end if;

  return new;
end;
$$;

create trigger companies_protect_columns
  before update on public.companies
  for each row execute function public.protect_company_columns();

create or replace function public.audit_company_status_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    perform public.log_audit_event(
      auth.uid(), new.organization_id, 'company.status_changed', 'company',
      new.id::text,
      jsonb_build_object('old_status', old.status, 'new_status', new.status)
    );
  end if;
  return new;
end;
$$;

create trigger companies_audit_status_changes
  after update on public.companies
  for each row execute function public.audit_company_status_changes();

-- ---------------------------------------------------------------------------
-- Update-request review (transactional, audited, permission-checked)
-- ---------------------------------------------------------------------------

create or replace function public.review_company_update_request(
  request_id uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.company_update_requests%rowtype;
  org uuid;
begin
  if not public.has_permission('companies.update_request_review') then
    raise exception 'permission denied: companies.update_request_review required'
      using errcode = '42501';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'invalid decision "%": expected approved or rejected', decision;
  end if;

  select r.* into req
    from public.company_update_requests r
   where r.id = request_id
   for update;

  if not found then
    raise exception 'update request % not found', request_id;
  end if;

  select c.organization_id into org
    from public.companies c where c.id = req.company_id;

  -- Assigned-scope staff must actually have access to this tenant.
  if not public.can_access_org(org) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;

  if req.status <> 'pending' then
    raise exception 'update request already reviewed (status: %)', req.status;
  end if;

  if decision = 'approved' then
    -- Whitelisted authoritative fields only.
    update public.companies c
       set legal_name = coalesce(req.changes ->> 'legal_name', c.legal_name),
           dba = coalesce(req.changes ->> 'dba', c.dba),
           business_purpose =
             coalesce(req.changes ->> 'business_purpose', c.business_purpose),
           ein = coalesce(req.changes ->> 'ein', c.ein),
           formation_state =
             coalesce(req.changes ->> 'formation_state', c.formation_state),
           formation_date =
             coalesce((req.changes ->> 'formation_date')::date, c.formation_date),
           registered_agent_name =
             coalesce(req.changes ->> 'registered_agent_name',
                      c.registered_agent_name)
     where c.id = req.company_id;
  end if;

  update public.company_update_requests
     set status = case when decision = 'approved'
                       then 'approved'::public.update_request_status
                       else 'rejected'::public.update_request_status end,
         reviewed_by = auth.uid(),
         reviewed_at = now(),
         review_note = note
   where id = request_id;

  perform public.log_audit_event(
    auth.uid(), org,
    'company_update_request.' || decision,
    'company_update_request', request_id::text,
    jsonb_build_object('company_id', req.company_id, 'note', note)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Invitation preview: lets the public acceptance page describe an invitation
-- from its one-time token without opening the invitations table. Returns at
-- most one row and only non-sensitive fields.
-- ---------------------------------------------------------------------------

create or replace function public.invitation_preview(token text)
returns table (
  email text,
  invited_role public.app_role,
  organization_name text,
  is_valid boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.email,
    i.role as invited_role,
    o.name as organization_name,
    (i.revoked_at is null
     and i.accepted_at is null
     and i.expires_at > now()) as is_valid
  from public.invitations i
  left join public.organizations o on o.id = i.organization_id
  where i.token_hash = encode(sha256(convert_to(token, 'utf8')), 'hex')
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.companies enable row level security;
alter table public.company_owners_members enable row level security;
alter table public.company_addresses enable row level security;
alter table public.company_compliance_deadlines enable row level security;
alter table public.company_update_requests enable row level security;

create policy "companies: tenant access"
  on public.companies for select
  to authenticated
  using (public.can_access_org(organization_id));

create policy "companies: members create drafts, staff create any"
  on public.companies for insert
  to authenticated
  with check (
    (public.is_org_member(organization_id)
     and status = 'draft'
     and created_by = (select auth.uid()))
    or (public.can_access_org(organization_id)
        and public.has_permission('clients.update'))
  );

create policy "companies: members edit drafts, review staff edit any"
  on public.companies for update
  to authenticated
  using (
    (public.is_org_member(organization_id) and status = 'draft')
    or (public.can_access_org(organization_id)
        and public.has_permission('companies.update_request_review'))
  )
  with check (public.can_access_org(organization_id));

create policy "companies: members delete own drafts"
  on public.companies for delete
  to authenticated
  using (
    public.is_org_member(organization_id)
    and status = 'draft'
  );

create policy "company children: visible with company access"
  on public.company_owners_members for select
  to authenticated
  using (public.can_access_company(company_id));

create policy "company children: editable on drafts or by review staff"
  on public.company_owners_members for insert
  to authenticated
  with check (public.can_edit_company_children(company_id));

create policy "company children: update on drafts or by review staff"
  on public.company_owners_members for update
  to authenticated
  using (public.can_edit_company_children(company_id))
  with check (public.can_edit_company_children(company_id));

create policy "company children: delete on drafts or by review staff"
  on public.company_owners_members for delete
  to authenticated
  using (public.can_edit_company_children(company_id));

create policy "company addresses: visible with company access"
  on public.company_addresses for select
  to authenticated
  using (public.can_access_company(company_id));

create policy "company addresses: editable on drafts or by review staff"
  on public.company_addresses for insert
  to authenticated
  with check (public.can_edit_company_children(company_id));

create policy "company addresses: update on drafts or by review staff"
  on public.company_addresses for update
  to authenticated
  using (public.can_edit_company_children(company_id))
  with check (public.can_edit_company_children(company_id));

create policy "company addresses: delete on drafts or by review staff"
  on public.company_addresses for delete
  to authenticated
  using (public.can_edit_company_children(company_id));

create policy "compliance deadlines: visible with company access"
  on public.company_compliance_deadlines for select
  to authenticated
  using (public.can_access_company(company_id));

create policy "compliance deadlines: managed by review staff"
  on public.company_compliance_deadlines for insert
  to authenticated
  with check (
    public.can_access_company(company_id)
    and public.has_permission('companies.update_request_review')
  );

create policy "compliance deadlines: updated by review staff"
  on public.company_compliance_deadlines for update
  to authenticated
  using (
    public.can_access_company(company_id)
    and public.has_permission('companies.update_request_review')
  )
  with check (
    public.can_access_company(company_id)
    and public.has_permission('companies.update_request_review')
  );

create policy "compliance deadlines: deleted by review staff"
  on public.company_compliance_deadlines for delete
  to authenticated
  using (
    public.can_access_company(company_id)
    and public.has_permission('companies.update_request_review')
  );

create policy "update requests: visible with company access"
  on public.company_update_requests for select
  to authenticated
  using (public.can_access_company(company_id));

create policy "update requests: members file against non-draft companies"
  on public.company_update_requests for insert
  to authenticated
  with check (
    requested_by = (select auth.uid())
    and exists (
      select 1 from public.companies c
       where c.id = company_id
         and public.is_org_member(c.organization_id)
         and c.status <> 'draft'
    )
  );

-- No UPDATE/DELETE policies: reviews happen exclusively through
-- review_company_update_request(), which is permission-checked and audited.

-- ============================================================
-- 20260717120000_catalogue_projects.sql
-- ============================================================
-- ProGuidance Portal — Phase 3: service catalogue & plans, projects/orders
-- with a configurable status machine, and data requests with versioned
-- submissions. Spec §6.4–§6.6.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.project_status as enum (
  'draft',
  'order_submitted',
  'payment_pending',
  'payment_confirmed',
  'information_required',
  'documents_under_review',
  'processing',
  'submitted_to_authority',
  'waiting_for_approval',
  'completed',
  'rejected_issue_found',
  'on_hold',
  'cancelled'
);

create type public.data_request_status as enum (
  'draft',
  'sent',
  'viewed',
  'in_progress',
  'submitted',
  'under_review',
  'approved',
  'rejected_changes_required',
  'overdue',
  'cancelled'
);

-- ---------------------------------------------------------------------------
-- Service catalogue (admin-managed; prices are data, never hardcoded in UI)
-- ---------------------------------------------------------------------------

create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort integer not null default 0
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.service_categories (id) on delete restrict,
  name text not null,
  slug text not null unique,
  summary text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  price_note text,
  government_fee_note text,
  turnaround text,
  requirements text,
  is_published boolean not null default false,
  -- Seed prices come from the previous portal and must be verified by an
  -- administrator before being treated as production offers (spec §6.4).
  requires_price_verification boolean not null default true,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index services_category_idx on public.services (category_id);
create index services_published_idx on public.services (is_published);

create trigger services_set_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create table public.service_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price_cents integer not null check (price_cents >= 0),
  billing_note text,
  is_published boolean not null default false,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.service_plan_items (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.service_plans (id) on delete cascade,
  label text not null,
  included boolean not null default true,
  sort integer not null default 0
);

create index service_plan_items_plan_idx on public.service_plan_items (plan_id);

-- ---------------------------------------------------------------------------
-- Projects / orders
-- ---------------------------------------------------------------------------

create sequence public.order_number_seq;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  service_id uuid not null references public.services (id) on delete restrict,
  order_number text not null unique
    default ('PG-ORD-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  status public.project_status not null default 'order_submitted',
  requested_by uuid references auth.users (id) on delete set null,
  client_note text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_org_idx on public.projects (organization_id);
create index projects_status_idx on public.projects (status);
create index projects_service_idx on public.projects (service_id);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_label text not null default 'moderator',
  assigned_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index project_assignments_project_idx
  on public.project_assignments (project_id);
create index project_assignments_user_idx
  on public.project_assignments (user_id);

create table public.project_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  due_date date,
  completed_at timestamptz,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);

create index project_milestones_project_idx
  on public.project_milestones (project_id);

-- Every status change is recorded with actor, both states, note, and
-- client visibility (staff-only notes stay invisible to clients).
create table public.project_status_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  actor_id uuid,
  from_status public.project_status,
  to_status public.project_status not null,
  note text,
  client_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create index project_status_history_project_idx
  on public.project_status_history (project_id, created_at);

-- Admin-configurable valid transitions (spec §6.5: "administrators able to
-- configure valid transitions"). Seeded with sensible defaults below.
create table public.project_status_transitions (
  from_status public.project_status not null,
  to_status public.project_status not null,
  primary key (from_status, to_status)
);

-- ---------------------------------------------------------------------------
-- Data requests (spec §6.6) with versioned submissions
-- ---------------------------------------------------------------------------

create table public.data_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  description text,
  kind text not null default 'information'
    check (kind in ('information', 'document')),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  due_date date,
  status public.data_request_status not null default 'sent',
  rejection_reason text,
  created_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index data_requests_org_idx on public.data_requests (organization_id);
create index data_requests_project_idx on public.data_requests (project_id);
create index data_requests_status_idx on public.data_requests (status);
create index data_requests_due_idx on public.data_requests (due_date);

create trigger data_requests_set_updated_at
  before update on public.data_requests
  for each row execute function public.set_updated_at();

-- Resubmission after rejection creates a new version; prior versions are
-- never destroyed (spec §6.6).
create table public.data_request_submissions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.data_requests (id) on delete cascade,
  submitted_by uuid references auth.users (id) on delete set null,
  body text not null,
  version integer not null,
  created_at timestamptz not null default now(),
  unique (request_id, version)
);

create index data_request_submissions_request_idx
  on public.data_request_submissions (request_id);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- A project's company must belong to the project's organization.
create or replace function public.validate_project_company()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.company_id is not null and not exists (
    select 1 from public.companies c
     where c.id = new.company_id
       and c.organization_id = new.organization_id
  ) then
    raise exception 'company does not belong to the project organization';
  end if;
  return new;
end;
$$;

create trigger projects_validate_company
  before insert or update on public.projects
  for each row execute function public.validate_project_company();

-- Record the initial status when an order is created.
create or replace function public.record_initial_project_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.project_status_history
    (project_id, actor_id, from_status, to_status, note, client_visible)
  values (new.id, auth.uid(), null, new.status, 'Order created', true);

  perform public.log_audit_event(
    auth.uid(), new.organization_id, 'project.created', 'project',
    new.id::text, jsonb_build_object('order_number', new.order_number)
  );
  return new;
end;
$$;

create trigger projects_record_initial_status
  after insert on public.projects
  for each row execute function public.record_initial_project_status();

-- Status changes must flow through transition_project(); direct updates are
-- rejected even for staff (uniform audit + validity checking).
create or replace function public.protect_project_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
     and coalesce(current_setting('app.project_status_change', true), '') <> 'allowed'
     and auth.uid() is not null then
    raise exception 'project status changes must use transition_project()'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger projects_protect_status
  before update on public.projects
  for each row execute function public.protect_project_status();

-- ---------------------------------------------------------------------------
-- Workflow functions
-- ---------------------------------------------------------------------------

create or replace function public.transition_project(
  p_project uuid,
  new_status public.project_status,
  note text default null,
  is_client_visible boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  proj public.projects%rowtype;
begin
  select p.* into proj from public.projects p where p.id = p_project for update;
  if not found then
    raise exception 'project % not found', p_project;
  end if;

  if not public.can_access_org(proj.organization_id) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;

  if not public.has_permission('projects.transition') then
    raise exception 'permission denied: projects.transition required'
      using errcode = '42501';
  end if;

  if new_status = 'completed'
     and not public.has_permission('projects.complete') then
    raise exception 'permission denied: projects.complete required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.project_status_transitions t
     where t.from_status = proj.status and t.to_status = new_status
  ) then
    raise exception 'invalid transition from % to %', proj.status, new_status;
  end if;

  perform set_config('app.project_status_change', 'allowed', true);
  update public.projects
     set status = new_status,
         completed_at = case when new_status = 'completed' then now()
                             else completed_at end
   where id = p_project;
  perform set_config('app.project_status_change', '', true);

  insert into public.project_status_history
    (project_id, actor_id, from_status, to_status, note, client_visible)
  values (p_project, auth.uid(), proj.status, new_status, note,
          is_client_visible);

  perform public.log_audit_event(
    auth.uid(), proj.organization_id, 'project.status_changed', 'project',
    p_project::text,
    jsonb_build_object('from', proj.status, 'to', new_status)
  );
end;
$$;

-- Client responds to a data request; each response is a preserved version.
create or replace function public.submit_data_request(
  p_request uuid,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.data_requests%rowtype;
  next_version integer;
begin
  select r.* into req from public.data_requests r
   where r.id = p_request for update;
  if not found then
    raise exception 'data request % not found', p_request;
  end if;

  if not public.is_org_member(req.organization_id) then
    raise exception 'permission denied: not a member of this organization'
      using errcode = '42501';
  end if;

  if req.status not in
     ('sent', 'viewed', 'in_progress', 'rejected_changes_required') then
    raise exception 'request cannot be submitted in status %', req.status;
  end if;

  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'submission body is required';
  end if;

  select coalesce(max(s.version), 0) + 1 into next_version
    from public.data_request_submissions s
   where s.request_id = p_request;

  insert into public.data_request_submissions
    (request_id, submitted_by, body, version)
  values (p_request, auth.uid(), p_body, next_version);

  update public.data_requests
     set status = 'submitted', rejection_reason = null
   where id = p_request;

  perform public.log_audit_event(
    auth.uid(), req.organization_id, 'data_request.submitted', 'data_request',
    p_request::text, jsonb_build_object('version', next_version)
  );
end;
$$;

-- Staff reviews a submitted data request.
create or replace function public.review_data_request(
  p_request uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  req public.data_requests%rowtype;
begin
  if not public.has_permission('requests.review') then
    raise exception 'permission denied: requests.review required'
      using errcode = '42501';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'invalid decision "%": expected approved or rejected', decision;
  end if;

  select r.* into req from public.data_requests r
   where r.id = p_request for update;
  if not found then
    raise exception 'data request % not found', p_request;
  end if;

  if not public.can_access_org(req.organization_id) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;

  if req.status not in ('submitted', 'under_review') then
    raise exception 'request is not awaiting review (status: %)', req.status;
  end if;

  update public.data_requests
     set status = case when decision = 'approved'
                       then 'approved'::public.data_request_status
                       else 'rejected_changes_required'::public.data_request_status end,
         rejection_reason = case when decision = 'rejected' then note end,
         reviewed_by = auth.uid(),
         reviewed_at = now()
   where id = p_request;

  perform public.log_audit_event(
    auth.uid(), req.organization_id, 'data_request.' || decision,
    'data_request', p_request::text, jsonb_build_object('note', note)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_plans enable row level security;
alter table public.service_plan_items enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.project_milestones enable row level security;
alter table public.project_status_history enable row level security;
alter table public.project_status_transitions enable row level security;
alter table public.data_requests enable row level security;
alter table public.data_request_submissions enable row level security;

-- Catalogue: published entries are visible to any authenticated user;
-- unpublished entries and all writes require services.manage.
create policy "categories: readable" on public.service_categories
  for select to authenticated using (true);
create policy "categories: manage" on public.service_categories
  for all to authenticated
  using (public.has_permission('services.manage'))
  with check (public.has_permission('services.manage'));

create policy "services: published or managers" on public.services
  for select to authenticated
  using (is_published or public.has_permission('services.manage'));
create policy "services: manage" on public.services
  for insert to authenticated
  with check (public.has_permission('services.manage'));
create policy "services: update" on public.services
  for update to authenticated
  using (public.has_permission('services.manage'))
  with check (public.has_permission('services.manage'));
create policy "services: delete" on public.services
  for delete to authenticated
  using (public.has_permission('services.manage'));

create policy "plans: published or managers" on public.service_plans
  for select to authenticated
  using (is_published or public.has_permission('services.manage'));
create policy "plans: manage" on public.service_plans
  for all to authenticated
  using (public.has_permission('services.manage'))
  with check (public.has_permission('services.manage'));

create policy "plan items: via plan visibility" on public.service_plan_items
  for select to authenticated
  using (exists (
    select 1 from public.service_plans p
     where p.id = plan_id
       and (p.is_published or public.has_permission('services.manage'))
  ));
create policy "plan items: manage" on public.service_plan_items
  for all to authenticated
  using (public.has_permission('services.manage'))
  with check (public.has_permission('services.manage'));

-- Projects: tenant-gated; clients order published services into their own
-- org; staff with projects.create can create anywhere in scope. Status is
-- immutable outside transition_project() (trigger above), and there is no
-- direct UPDATE/DELETE policy at all.
create policy "projects: tenant access" on public.projects
  for select to authenticated
  using (public.can_access_org(organization_id));

create policy "projects: members order published services" on public.projects
  for insert to authenticated
  with check (
    (
      public.is_org_member(organization_id)
      and requested_by = (select auth.uid())
      and status = 'order_submitted'
      and exists (
        select 1 from public.services s
         where s.id = service_id and s.is_published
      )
    )
    or (
      public.has_permission('projects.create')
      and public.can_access_org(organization_id)
    )
  );

create policy "assignments: tenant access" on public.project_assignments
  for select to authenticated
  using (exists (
    select 1 from public.projects p
     where p.id = project_id and public.can_access_org(p.organization_id)
  ));
create policy "assignments: manage with projects.assign"
  on public.project_assignments
  for insert to authenticated
  with check (
    public.has_permission('projects.assign')
    and exists (
      select 1 from public.projects p
       where p.id = project_id and public.can_access_org(p.organization_id)
    )
  );
create policy "assignments: delete with projects.assign"
  on public.project_assignments
  for delete to authenticated
  using (
    public.has_permission('projects.assign')
    and exists (
      select 1 from public.projects p
       where p.id = project_id and public.can_access_org(p.organization_id)
    )
  );

create policy "milestones: tenant access" on public.project_milestones
  for select to authenticated
  using (exists (
    select 1 from public.projects p
     where p.id = project_id and public.can_access_org(p.organization_id)
  ));
create policy "milestones: staff manage" on public.project_milestones
  for all to authenticated
  using (
    public.has_permission('projects.transition')
    and exists (
      select 1 from public.projects p
       where p.id = project_id and public.can_access_org(p.organization_id)
    )
  )
  with check (
    public.has_permission('projects.transition')
    and exists (
      select 1 from public.projects p
       where p.id = project_id and public.can_access_org(p.organization_id)
    )
  );

-- History: clients see client-visible entries; staff in scope see all.
-- Writes happen only inside SECURITY DEFINER functions.
create policy "history: client-visible entries" on public.project_status_history
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
       where p.id = project_id and public.can_access_org(p.organization_id)
    )
    and (client_visible or (select public.is_staff()))
  );

-- Transition matrix: readable by staff (drives UI controls); configurable
-- by administrators via services.manage.
create policy "transitions: staff read" on public.project_status_transitions
  for select to authenticated
  using ((select public.is_staff()));
create policy "transitions: admins configure" on public.project_status_transitions
  for all to authenticated
  using (public.has_permission('services.manage'))
  with check (public.has_permission('services.manage'));

-- Data requests: tenant-gated reads; staff with requests.create file them;
-- status mutations flow only through the functions above.
create policy "data requests: tenant access" on public.data_requests
  for select to authenticated
  using (public.can_access_org(organization_id));

create policy "data requests: staff create" on public.data_requests
  for insert to authenticated
  with check (
    public.has_permission('requests.create')
    and public.can_access_org(organization_id)
    and created_by = (select auth.uid())
    and status = 'sent'
  );

create policy "submissions: tenant access" on public.data_request_submissions
  for select to authenticated
  using (exists (
    select 1 from public.data_requests r
     where r.id = request_id and public.can_access_org(r.organization_id)
  ));

-- ---------------------------------------------------------------------------
-- Seed: default transition matrix
-- ---------------------------------------------------------------------------

insert into public.project_status_transitions (from_status, to_status) values
  ('draft', 'order_submitted'),
  ('draft', 'cancelled'),
  ('order_submitted', 'payment_pending'),
  ('order_submitted', 'payment_confirmed'),
  ('order_submitted', 'information_required'),
  ('order_submitted', 'processing'),
  ('order_submitted', 'on_hold'),
  ('order_submitted', 'cancelled'),
  ('payment_pending', 'payment_confirmed'),
  ('payment_pending', 'on_hold'),
  ('payment_pending', 'cancelled'),
  ('payment_confirmed', 'information_required'),
  ('payment_confirmed', 'processing'),
  ('payment_confirmed', 'on_hold'),
  ('payment_confirmed', 'cancelled'),
  ('information_required', 'documents_under_review'),
  ('information_required', 'processing'),
  ('information_required', 'on_hold'),
  ('information_required', 'cancelled'),
  ('documents_under_review', 'information_required'),
  ('documents_under_review', 'processing'),
  ('documents_under_review', 'on_hold'),
  ('documents_under_review', 'cancelled'),
  ('processing', 'submitted_to_authority'),
  ('processing', 'information_required'),
  ('processing', 'completed'),
  ('processing', 'rejected_issue_found'),
  ('processing', 'on_hold'),
  ('processing', 'cancelled'),
  ('submitted_to_authority', 'waiting_for_approval'),
  ('submitted_to_authority', 'rejected_issue_found'),
  ('submitted_to_authority', 'completed'),
  ('waiting_for_approval', 'completed'),
  ('waiting_for_approval', 'rejected_issue_found'),
  ('rejected_issue_found', 'processing'),
  ('rejected_issue_found', 'information_required'),
  ('rejected_issue_found', 'cancelled'),
  ('on_hold', 'order_submitted'),
  ('on_hold', 'payment_pending'),
  ('on_hold', 'processing'),
  ('on_hold', 'cancelled');

-- ---------------------------------------------------------------------------
-- Seed: catalogue (prices from the previous portal — every one flagged
-- requires_price_verification until an administrator confirms; spec §6.4)
-- ---------------------------------------------------------------------------

insert into public.service_categories (id, name, slug, sort) values
  ('00000000-0000-4000-d000-000000000001', 'Formation & Compliance', 'formation-compliance', 1),
  ('00000000-0000-4000-d000-000000000002', 'Tax & Accounting', 'tax-accounting', 2),
  ('00000000-0000-4000-d000-000000000003', 'Banking & Payments', 'banking-payments', 3),
  ('00000000-0000-4000-d000-000000000004', 'Marketplace & E-commerce', 'marketplace-ecommerce', 4),
  ('00000000-0000-4000-d000-000000000005', 'Web & Marketing', 'web-marketing', 5);

insert into public.services
  (category_id, name, slug, summary, price_cents, price_note, is_published, sort)
values
  ('00000000-0000-4000-d000-000000000001', 'USA LLC Formation', 'usa-llc-formation',
   'Form a US LLC with state filing handled end to end.', 19900, null, true, 1),
  ('00000000-0000-4000-d000-000000000001', 'Virtual Address', 'virtual-address',
   'US business address with mail handling.', 14900, null, true, 2),
  ('00000000-0000-4000-d000-000000000001', 'Registered Agent', 'registered-agent',
   'Registered agent service for your US company.', 9900, null, true, 3),
  ('00000000-0000-4000-d000-000000000001', 'Annual Compliance Filing', 'annual-compliance-filing',
   'Annual report preparation and filing.', 12900, null, true, 4),
  ('00000000-0000-4000-d000-000000000002', 'EIN Application', 'ein-application',
   'Federal EIN application for your company.', 7900, null, true, 1),
  ('00000000-0000-4000-d000-000000000002', 'ITIN Application', 'itin-application',
   'Individual Taxpayer Identification Number support.', 14900, null, true, 2),
  ('00000000-0000-4000-d000-000000000002', 'Resale Certificate', 'resale-certificate',
   'Sales-tax resale certificate processing.', 5900, null, true, 3),
  ('00000000-0000-4000-d000-000000000002', 'Tax Filing', 'tax-filing',
   'Business tax return preparation and filing.', 29900, null, true, 4),
  ('00000000-0000-4000-d000-000000000002', 'Bookkeeping', 'bookkeeping',
   'Monthly bookkeeping for your US business.', 9900, '/month', true, 5),
  ('00000000-0000-4000-d000-000000000003', 'PayPal Setup', 'paypal-setup',
   'PayPal business account setup support.', 9900, null, true, 1),
  ('00000000-0000-4000-d000-000000000003', 'Stripe Setup', 'stripe-setup',
   'Stripe account setup support for your business.', 9900, null, true, 2),
  ('00000000-0000-4000-d000-000000000003', 'Wise Setup', 'wise-setup',
   'Wise business account setup support.', 7900, null, true, 3),
  ('00000000-0000-4000-d000-000000000003', 'Payoneer Setup', 'payoneer-setup',
   'Payoneer account setup support.', 7900, null, true, 4),
  ('00000000-0000-4000-d000-000000000003', 'Bank Account Support', 'bank-account-support',
   'US business bank account opening support.', 14900, null, true, 5),
  ('00000000-0000-4000-d000-000000000004', 'Walmart Seller Account Setup', 'walmart-seller-setup',
   'Walmart marketplace seller account setup.', 24900, null, true, 1),
  ('00000000-0000-4000-d000-000000000004', 'Amazon Seller Account Setup', 'amazon-seller-setup',
   'Amazon marketplace seller account setup.', 24900, null, true, 2),
  ('00000000-0000-4000-d000-000000000004', 'Marketplace Appeal', 'marketplace-appeal',
   'Appeal support for marketplace account issues.', 19900, null, true, 3),
  ('00000000-0000-4000-d000-000000000005', 'Website Development', 'website-development',
   'Business website design and development.', 49900, null, true, 1),
  ('00000000-0000-4000-d000-000000000005', 'Digital Marketing', 'digital-marketing',
   'Ongoing digital marketing for your business.', 29900, '/month', true, 2);

-- Demonstration plan tiers: clearly labelled and UNPUBLISHED. Real
-- ProGuidance bundles must be configured and published by an administrator
-- (spec §6.4: never invent bundle offers).
insert into public.service_plans
  (id, name, slug, description, price_cents, billing_note, is_published, sort)
values
  ('00000000-0000-4000-e000-000000000001', 'Starter (Demonstration)', 'starter-demo',
   'Demonstration tier for development — not a real offer.', 29900, 'one-time', false, 1),
  ('00000000-0000-4000-e000-000000000002', 'Growth (Demonstration)', 'growth-demo',
   'Demonstration tier for development — not a real offer.', 59900, 'one-time', false, 2);

insert into public.service_plan_items (plan_id, label, included, sort) values
  ('00000000-0000-4000-e000-000000000001', 'USA LLC Formation', true, 1),
  ('00000000-0000-4000-e000-000000000001', 'EIN Application', true, 2),
  ('00000000-0000-4000-e000-000000000001', 'Registered Agent (year 1)', true, 3),
  ('00000000-0000-4000-e000-000000000002', 'Everything in Starter', true, 1),
  ('00000000-0000-4000-e000-000000000002', 'Virtual Address (year 1)', true, 2),
  ('00000000-0000-4000-e000-000000000002', 'Bank Account Support', true, 3);

-- ============================================================
-- 20260717130000_documents.sql
-- ============================================================
-- ProGuidance Portal — Phase 4: secure document vault.
-- Documents, versioned files, review workflow with a hard quarantine
-- default, and default-deny private storage. Spec §6.7.
--
-- Storage note: the private 'documents' bucket (created in the foundation
-- migration) deliberately has NO storage.objects policies — default deny.
-- Every upload and download flows through server code that re-authorizes
-- against the tables below and then uses short-lived signed URLs.

create type public.document_review_status as enum (
  'quarantined',      -- default on upload; not previewable/downloadable
  'pending_review',   -- scanned clean or admin-released; awaiting review
  'approved',
  'rejected'
);

create type public.scan_status as enum (
  'pending',
  'clean',
  'infected',
  'unavailable'       -- scanner unconfigured/timeout → stays quarantined
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  company_id uuid references public.companies (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  data_request_id uuid references public.data_requests (id) on delete set null,
  title text not null check (char_length(title) between 1 and 200),
  category text not null default 'other' check (category in (
    'formation', 'identity', 'tax', 'banking', 'marketplace',
    'approval_letter', 'certificate', 'other'
  )),
  -- 'client' documents are visible to the owning organization;
  -- 'staff' documents are internal work product, hidden from clients.
  visibility text not null default 'client'
    check (visibility in ('client', 'staff')),
  review_status public.document_review_status not null default 'quarantined',
  review_note text,
  current_version integer not null default 0,
  expires_at date,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index documents_org_idx on public.documents (organization_id);
create index documents_status_idx on public.documents (review_status);
create index documents_project_idx on public.documents (project_id);
create index documents_request_idx on public.documents (data_request_id);
create index documents_expires_idx on public.documents (expires_at);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

create table public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version integer not null,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0),
  checksum_sha256 text not null check (checksum_sha256 ~ '^[a-f0-9]{64}$'),
  storage_path text not null,
  scan_status public.scan_status not null default 'pending',
  scanned_at timestamptz,
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);

create index document_versions_document_idx
  on public.document_versions (document_id);

create table public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version integer not null,
  reviewer_id uuid references auth.users (id) on delete set null,
  decision text not null check (decision in ('approved', 'rejected', 'released', 'quarantine_rejected')),
  note text,
  created_at timestamptz not null default now()
);

create index document_reviews_document_idx
  on public.document_reviews (document_id);

-- ---------------------------------------------------------------------------
-- Lifecycle protection: review_status and current_version move only through
-- the SECURITY DEFINER functions below (GUC guard), never by direct update.
-- ---------------------------------------------------------------------------

create or replace function public.protect_document_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or coalesce(current_setting('app.document_lifecycle', true), '') = 'allowed' then
    return new;
  end if;

  if new.review_status is distinct from old.review_status
     or new.current_version is distinct from old.current_version
     or new.review_note is distinct from old.review_note then
    raise exception 'document lifecycle fields change only through review functions'
      using errcode = '42501';
  end if;

  if new.organization_id is distinct from old.organization_id then
    raise exception 'documents cannot move between organizations'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger documents_protect_columns
  before update on public.documents
  for each row execute function public.protect_document_columns();

-- New versions bump the parent document and reset it to quarantine — a
-- resubmission is never trusted more than the first upload.
create or replace function public.register_document_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.document_lifecycle', 'allowed', true);
  update public.documents
     set current_version = greatest(current_version, new.version),
         review_status = 'quarantined',
         review_note = null
   where id = new.document_id;
  perform set_config('app.document_lifecycle', '', true);

  perform public.log_audit_event(
    auth.uid(),
    (select d.organization_id from public.documents d where d.id = new.document_id),
    'document.version_uploaded', 'document', new.document_id::text,
    jsonb_build_object('version', new.version, 'checksum', new.checksum_sha256)
  );
  return new;
end;
$$;

create trigger document_versions_register
  after insert on public.document_versions
  for each row execute function public.register_document_version();

-- ---------------------------------------------------------------------------
-- Scan + review workflow functions
-- ---------------------------------------------------------------------------

-- Recorded by the server-side scan pipeline (service role / system context)
-- or an administrator. Clean scans promote quarantine → pending_review;
-- anything else keeps the hard quarantine.
create or replace function public.mark_document_scanned(
  p_version uuid,
  result public.scan_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ver public.document_versions%rowtype;
begin
  if auth.uid() is not null and not public.is_administrator() then
    raise exception 'permission denied: scan results are recorded by the system'
      using errcode = '42501';
  end if;

  if result = 'pending' then
    raise exception 'invalid scan result';
  end if;

  select v.* into ver from public.document_versions v
   where v.id = p_version for update;
  if not found then
    raise exception 'document version % not found', p_version;
  end if;

  update public.document_versions
     set scan_status = result, scanned_at = now()
   where id = p_version;

  if result = 'clean' then
    perform set_config('app.document_lifecycle', 'allowed', true);
    update public.documents
       set review_status = 'pending_review'
     where id = ver.document_id and review_status = 'quarantined';
    perform set_config('app.document_lifecycle', '', true);
  end if;

  perform public.log_audit_event(
    auth.uid(),
    (select d.organization_id from public.documents d where d.id = ver.document_id),
    'document.scanned', 'document', ver.document_id::text,
    jsonb_build_object('version', ver.version, 'result', result)
  );
end;
$$;

-- Administrator-only release/reject of unscanned uploads (spec §6.7: files
-- must never leave quarantine without an authorized administrator when
-- scanning is unavailable).
create or replace function public.release_quarantined_document(
  p_document uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  doc public.documents%rowtype;
begin
  if not public.is_administrator() then
    raise exception 'permission denied: only administrators release quarantined files'
      using errcode = '42501';
  end if;

  if decision not in ('release', 'reject') then
    raise exception 'invalid decision "%": expected release or reject', decision;
  end if;

  select d.* into doc from public.documents d
   where d.id = p_document for update;
  if not found then
    raise exception 'document % not found', p_document;
  end if;

  if doc.review_status <> 'quarantined' then
    raise exception 'document is not quarantined (status: %)', doc.review_status;
  end if;

  perform set_config('app.document_lifecycle', 'allowed', true);
  update public.documents
     set review_status = case when decision = 'release'
                              then 'pending_review'::public.document_review_status
                              else 'rejected'::public.document_review_status end,
         review_note = note
   where id = p_document;
  perform set_config('app.document_lifecycle', '', true);

  insert into public.document_reviews
    (document_id, version, reviewer_id, decision, note)
  values (p_document, doc.current_version, auth.uid(),
          case when decision = 'release' then 'released'
               else 'quarantine_rejected' end, note);

  perform public.log_audit_event(
    auth.uid(), doc.organization_id,
    'document.quarantine_' || decision, 'document', p_document::text,
    jsonb_build_object('note', note)
  );
end;
$$;

-- Standard document review (documents.review permission, tenant-scoped).
create or replace function public.review_document(
  p_document uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  doc public.documents%rowtype;
begin
  if not public.has_permission('documents.review') then
    raise exception 'permission denied: documents.review required'
      using errcode = '42501';
  end if;

  if decision not in ('approved', 'rejected') then
    raise exception 'invalid decision "%": expected approved or rejected', decision;
  end if;

  select d.* into doc from public.documents d
   where d.id = p_document for update;
  if not found then
    raise exception 'document % not found', p_document;
  end if;

  if not public.can_access_org(doc.organization_id) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;

  if doc.review_status <> 'pending_review' then
    raise exception 'document is not awaiting review (status: %)', doc.review_status;
  end if;

  if decision = 'rejected' and (note is null or char_length(trim(note)) = 0) then
    raise exception 'a rejection requires a reason';
  end if;

  perform set_config('app.document_lifecycle', 'allowed', true);
  update public.documents
     set review_status = case when decision = 'approved'
                              then 'approved'::public.document_review_status
                              else 'rejected'::public.document_review_status end,
         review_note = note
   where id = p_document;
  perform set_config('app.document_lifecycle', '', true);

  insert into public.document_reviews
    (document_id, version, reviewer_id, decision, note)
  values (p_document, doc.current_version, auth.uid(), decision, note);

  perform public.log_audit_event(
    auth.uid(), doc.organization_id, 'document.' || decision,
    'document', p_document::text, jsonb_build_object('note', note)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.documents enable row level security;
alter table public.document_versions enable row level security;
alter table public.document_reviews enable row level security;

-- Visibility rules:
--   * tenant boundary via can_access_org
--   * 'staff' documents never reach clients
--   * quarantined documents are visible only to their uploader (status
--     awareness) and administrators — never to other org members or
--     ordinary staff
create or replace function public.can_see_document(doc uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.documents d
     where d.id = doc
       and public.can_access_org(d.organization_id)
       and (d.visibility = 'client' or public.is_staff())
       and (d.review_status <> 'quarantined'
            or d.uploaded_by = auth.uid()
            or public.is_administrator())
  );
$$;

create policy "documents: scoped visibility"
  on public.documents for select
  to authenticated
  using (public.can_see_document(id));

create policy "documents: members and staff upload"
  on public.documents for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and review_status = 'quarantined'
    and (
      (public.is_org_member(organization_id) and visibility = 'client')
      or (public.has_permission('documents.upload')
          and public.can_access_org(organization_id)
          and (select public.is_staff()))
    )
  );

create policy "documents: staff metadata edits"
  on public.documents for update
  to authenticated
  using (
    public.has_permission('documents.review')
    and public.can_access_org(organization_id)
  )
  with check (
    public.has_permission('documents.review')
    and public.can_access_org(organization_id)
  );

create policy "documents: delete metadata permission"
  on public.documents for delete
  to authenticated
  using (
    public.has_permission('documents.delete_metadata')
    and public.can_access_org(organization_id)
  );

create policy "document versions: via parent document"
  on public.document_versions for select
  to authenticated
  using (public.can_see_document(document_id));

create policy "document versions: uploader adds versions"
  on public.document_versions for insert
  to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and exists (
      select 1 from public.documents d
       where d.id = document_id
         and public.can_access_org(d.organization_id)
         and (
           d.uploaded_by = (select auth.uid())
           or (public.has_permission('documents.upload')
               and (select public.is_staff()))
         )
    )
  );

create policy "document reviews: via parent document"
  on public.document_reviews for select
  to authenticated
  using (public.can_see_document(document_id));

-- Reviews are inserted only by the SECURITY DEFINER functions above.

-- ============================================================
-- 20260718090000_billing.sql
-- ============================================================
-- ProGuidance Portal — Phase 5: quotations, invoices, payments, wallet.
-- USD only; money is integer cents. Spec §6.8–§6.9.

create type public.quotation_status as enum (
  'requested', 'under_review', 'draft', 'sent', 'viewed',
  'changes_requested', 'accepted', 'declined', 'expired', 'converted'
);

create type public.invoice_status as enum (
  'draft', 'sent', 'viewed', 'partially_paid', 'paid',
  'overdue', 'void', 'refunded'
);

create type public.payment_status as enum (
  'submitted', 'under_review', 'approved', 'rejected', 'reversed'
);

create type public.ledger_entry_type as enum ('credit', 'debit');

create sequence public.quote_number_seq;
create sequence public.invoice_number_seq;

-- ---------------------------------------------------------------------------
-- Quotations (versioned; acceptance recorded with actor + time)
-- ---------------------------------------------------------------------------

create table public.quotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  quote_number text not null unique
    default ('PG-QUO-' || lpad(nextval('public.quote_number_seq')::text, 6, '0')),
  title text not null check (char_length(title) between 1 and 200),
  status public.quotation_status not null default 'requested',
  request_note text,
  terms text,
  valid_until date,
  current_version integer not null default 0,
  requested_by uuid references auth.users (id) on delete set null,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  decision_note text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quotations_org_idx on public.quotations (organization_id);
create index quotations_status_idx on public.quotations (status);

create trigger quotations_set_updated_at
  before update on public.quotations
  for each row execute function public.set_updated_at();

create table public.quotation_versions (
  id uuid primary key default gen_random_uuid(),
  quotation_id uuid not null references public.quotations (id) on delete cascade,
  version integer not null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (quotation_id, version)
);

create table public.quotation_line_items (
  id uuid primary key default gen_random_uuid(),
  quotation_version_id uuid not null references public.quotation_versions (id) on delete cascade,
  label text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  is_government_fee boolean not null default false,
  sort integer not null default 0
);

create index quotation_line_items_version_idx
  on public.quotation_line_items (quotation_version_id);

-- ---------------------------------------------------------------------------
-- Invoices (issued invoices are immutable snapshots)
-- ---------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  -- Uniqueness makes quote conversion idempotent at the database level.
  quotation_id uuid unique references public.quotations (id) on delete set null,
  invoice_number text not null unique
    default ('PG-INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')),
  status public.invoice_status not null default 'draft',
  issue_date date,
  due_date date,
  total_cents integer not null default 0 check (total_cents >= 0),
  amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0),
  notes text,
  terms text,
  issued_by uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index invoices_org_idx on public.invoices (organization_id);
create index invoices_status_idx on public.invoices (status);

create trigger invoices_set_updated_at
  before update on public.invoices
  for each row execute function public.set_updated_at();

create table public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  label text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null check (unit_price_cents >= 0),
  is_government_fee boolean not null default false,
  sort integer not null default 0
);

create index invoice_line_items_invoice_idx
  on public.invoice_line_items (invoice_id);

-- ---------------------------------------------------------------------------
-- Payments (manual/bank/Wise proof first; reviewed by administrators)
-- ---------------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  invoice_id uuid references public.invoices (id) on delete set null,
  method text not null check (method in
    ('bank_transfer', 'wise', 'manual', 'wallet_topup')),
  amount_cents integer not null check (amount_cents > 0),
  reference text,
  paid_date date,
  note text,
  status public.payment_status not null default 'submitted',
  submitted_by uuid references auth.users (id) on delete set null,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index payments_org_idx on public.payments (organization_id);
create index payments_invoice_idx on public.payments (invoice_id);
create index payments_status_idx on public.payments (status);

-- ---------------------------------------------------------------------------
-- Wallet (USD only; append-only ledger is the financial truth)
-- ---------------------------------------------------------------------------

create table public.wallet_accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations (id) on delete cascade,
  balance_cents bigint not null default 0 check (balance_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.wallet_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  wallet_account_id uuid not null references public.wallet_accounts (id) on delete cascade,
  entry_type public.ledger_entry_type not null,
  amount_cents bigint not null check (amount_cents > 0),
  balance_after_cents bigint not null check (balance_after_cents >= 0),
  reference text,
  related_invoice_id uuid references public.invoices (id) on delete set null,
  related_payment_id uuid references public.payments (id) on delete set null,
  idempotency_key text unique,
  actor_id uuid,
  created_at timestamptz not null default now()
);

create index wallet_ledger_wallet_idx
  on public.wallet_ledger_entries (wallet_account_id, created_at);

revoke update, delete on public.wallet_ledger_entries from authenticated, anon;

-- ---------------------------------------------------------------------------
-- Lifecycle protection
-- ---------------------------------------------------------------------------

create or replace function public.protect_billing_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or coalesce(current_setting('app.billing_lifecycle', true), '') = 'allowed' then
    return new;
  end if;

  if tg_table_name = 'quotations' then
    if new.status is distinct from old.status
       or new.current_version is distinct from old.current_version
       or new.decided_by is distinct from old.decided_by then
      raise exception 'quotation lifecycle changes only through billing functions'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'invoices' then
    if new.status is distinct from old.status
       or new.amount_paid_cents is distinct from old.amount_paid_cents
       or new.total_cents is distinct from old.total_cents
       or new.issue_date is distinct from old.issue_date then
      raise exception 'invoice lifecycle changes only through billing functions'
        using errcode = '42501';
    end if;
    if old.status <> 'draft' then
      raise exception 'issued invoices are immutable; use credit notes'
        using errcode = '42501';
    end if;
  elsif tg_table_name = 'payments' then
    if new.status is distinct from old.status
       or new.amount_cents is distinct from old.amount_cents then
      raise exception 'payment decisions only through review_payment()'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

create trigger quotations_protect before update on public.quotations
  for each row execute function public.protect_billing_columns();
create trigger invoices_protect before update on public.invoices
  for each row execute function public.protect_billing_columns();
create trigger payments_protect before update on public.payments
  for each row execute function public.protect_billing_columns();

-- Adding a quotation version bumps the parent automatically (staff never
-- touch current_version directly).
create or replace function public.register_quotation_version()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.billing_lifecycle', 'allowed', true);
  update public.quotations
     set current_version = greatest(current_version, new.version)
   where id = new.quotation_id;
  perform set_config('app.billing_lifecycle', '', true);
  return new;
end;
$$;

create trigger quotation_versions_register
  after insert on public.quotation_versions
  for each row execute function public.register_quotation_version();

-- Issued-invoice line items are frozen.
create or replace function public.protect_invoice_items()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv_status public.invoice_status;
  inv_id uuid;
begin
  inv_id := coalesce(new.invoice_id, old.invoice_id);
  select i.status into inv_status from public.invoices i where i.id = inv_id;
  if inv_status is distinct from 'draft'
     and coalesce(current_setting('app.billing_lifecycle', true), '') <> 'allowed'
     and auth.uid() is not null then
    raise exception 'line items of an issued invoice are immutable'
      using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger invoice_items_protect
  before insert or update or delete on public.invoice_line_items
  for each row execute function public.protect_invoice_items();

-- ---------------------------------------------------------------------------
-- Billing functions
-- ---------------------------------------------------------------------------

create or replace function public.send_quotation(p_quote uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote public.quotations%rowtype;
begin
  if not public.has_permission('quotations.send') then
    raise exception 'permission denied: quotations.send required'
      using errcode = '42501';
  end if;
  select q.* into quote from public.quotations q where q.id = p_quote for update;
  if not found then raise exception 'quotation % not found', p_quote; end if;
  if not public.can_access_org(quote.organization_id) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;
  if quote.status not in ('requested', 'under_review', 'draft', 'changes_requested') then
    raise exception 'quotation cannot be sent from status %', quote.status;
  end if;
  if quote.current_version = 0 then
    raise exception 'add a version with line items before sending';
  end if;

  perform set_config('app.billing_lifecycle', 'allowed', true);
  update public.quotations set status = 'sent' where id = p_quote;
  perform set_config('app.billing_lifecycle', '', true);

  perform public.log_audit_event(auth.uid(), quote.organization_id,
    'quotation.sent', 'quotation', p_quote::text, '{}'::jsonb);
end;
$$;

-- Client decision on a sent quotation (actor + timestamp recorded).
create or replace function public.decide_quotation(
  p_quote uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote public.quotations%rowtype;
  new_status public.quotation_status;
begin
  select q.* into quote from public.quotations q where q.id = p_quote for update;
  if not found then raise exception 'quotation % not found', p_quote; end if;

  if not public.is_org_member(quote.organization_id) then
    raise exception 'permission denied: not a member of this organization'
      using errcode = '42501';
  end if;

  if quote.status not in ('sent', 'viewed', 'changes_requested') then
    raise exception 'quotation is not open for a decision (status: %)', quote.status;
  end if;

  new_status := case decision
    when 'accept' then 'accepted'::public.quotation_status
    when 'decline' then 'declined'::public.quotation_status
    when 'request_changes' then 'changes_requested'::public.quotation_status
    else null
  end;
  if new_status is null then
    raise exception 'invalid decision "%": expected accept, decline, or request_changes', decision;
  end if;

  if quote.valid_until is not null and quote.valid_until < current_date
     and decision = 'accept' then
    raise exception 'quotation has expired and can no longer be accepted';
  end if;

  perform set_config('app.billing_lifecycle', 'allowed', true);
  update public.quotations
     set status = new_status,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_note = note
   where id = p_quote;
  perform set_config('app.billing_lifecycle', '', true);

  perform public.log_audit_event(auth.uid(), quote.organization_id,
    'quotation.' || decision, 'quotation', p_quote::text,
    jsonb_build_object('note', note));
end;
$$;

-- Accepted quotation → exactly one project (order_submitted) + one DRAFT
-- invoice, transactionally and idempotently. Issuance stays a separate,
-- deliberate staff step (spec §6.8).
create or replace function public.convert_quotation(p_quote uuid)
returns uuid  -- the created invoice id
language plpgsql
security definer
set search_path = ''
as $$
declare
  quote public.quotations%rowtype;
  fallback_service uuid;
  new_project uuid;
  new_invoice uuid;
  total integer;
begin
  if not public.has_permission('quotations.convert') then
    raise exception 'permission denied: quotations.convert required'
      using errcode = '42501';
  end if;

  select q.* into quote from public.quotations q where q.id = p_quote for update;
  if not found then raise exception 'quotation % not found', p_quote; end if;
  if not public.can_access_org(quote.organization_id) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;
  if quote.status = 'converted' then
    raise exception 'quotation has already been converted';
  end if;
  if quote.status <> 'accepted' then
    raise exception 'only accepted quotations convert (status: %)', quote.status;
  end if;

  if quote.project_id is null then
    select s.id into fallback_service
      from public.services s where s.is_published order by s.sort limit 1;
    if fallback_service is null then
      raise exception 'no published service available to attach the order to';
    end if;
    insert into public.projects
      (organization_id, company_id, service_id, requested_by, client_note)
    values (quote.organization_id, quote.company_id, fallback_service,
            quote.requested_by, 'Created from quotation ' || quote.quote_number)
    returning id into new_project;
  else
    new_project := quote.project_id;
  end if;

  select coalesce(sum(round(li.quantity * li.unit_price_cents)), 0)::integer
    into total
    from public.quotation_line_items li
    join public.quotation_versions v on v.id = li.quotation_version_id
   where v.quotation_id = p_quote and v.version = quote.current_version;

  -- invoices.quotation_id is UNIQUE: a concurrent/retried conversion fails
  -- here instead of duplicating.
  insert into public.invoices
    (organization_id, project_id, company_id, quotation_id, total_cents,
     notes, terms, created_by)
  values (quote.organization_id, new_project, quote.company_id, p_quote,
          total, 'From quotation ' || quote.quote_number, quote.terms,
          auth.uid())
  returning id into new_invoice;

  insert into public.invoice_line_items
    (invoice_id, label, quantity, unit_price_cents, is_government_fee, sort)
  select new_invoice, li.label, li.quantity, li.unit_price_cents,
         li.is_government_fee, li.sort
    from public.quotation_line_items li
    join public.quotation_versions v on v.id = li.quotation_version_id
   where v.quotation_id = p_quote and v.version = quote.current_version;

  perform set_config('app.billing_lifecycle', 'allowed', true);
  update public.quotations set status = 'converted' where id = p_quote;
  perform set_config('app.billing_lifecycle', '', true);

  perform public.log_audit_event(auth.uid(), quote.organization_id,
    'quotation.converted', 'quotation', p_quote::text,
    jsonb_build_object('invoice_id', new_invoice, 'project_id', new_project));

  return new_invoice;
end;
$$;

create or replace function public.issue_invoice(
  p_invoice uuid,
  p_due_date date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inv public.invoices%rowtype;
  total integer;
begin
  if not public.has_permission('invoices.issue') then
    raise exception 'permission denied: invoices.issue required'
      using errcode = '42501';
  end if;

  select i.* into inv from public.invoices i where i.id = p_invoice for update;
  if not found then raise exception 'invoice % not found', p_invoice; end if;
  if not public.can_access_org(inv.organization_id) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;
  if inv.status <> 'draft' then
    raise exception 'only draft invoices can be issued (status: %)', inv.status;
  end if;

  select coalesce(sum(round(li.quantity * li.unit_price_cents)), 0)::integer
    into total from public.invoice_line_items li where li.invoice_id = p_invoice;
  if total <= 0 then
    raise exception 'an invoice needs line items before it can be issued';
  end if;

  perform set_config('app.billing_lifecycle', 'allowed', true);
  update public.invoices
     set status = 'sent',
         total_cents = total,
         issue_date = current_date,
         due_date = coalesce(p_due_date, current_date + 14),
         issued_by = auth.uid()
   where id = p_invoice;
  perform set_config('app.billing_lifecycle', '', true);

  perform public.log_audit_event(auth.uid(), inv.organization_id,
    'invoice.issued', 'invoice', p_invoice::text,
    jsonb_build_object('total_cents', total));
end;
$$;

-- Administrator review of a payment: atomically settles the payment, the
-- invoice balance/status, the wallet ledger (top-ups), and the audit log.
create or replace function public.review_payment(
  p_payment uuid,
  decision text,
  note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  pay public.payments%rowtype;
  inv public.invoices%rowtype;
  wallet public.wallet_accounts%rowtype;
  new_paid integer;
begin
  if not public.has_permission('payments.review') then
    raise exception 'permission denied: payments.review required'
      using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'invalid decision "%": expected approved or rejected', decision;
  end if;

  select p.* into pay from public.payments p where p.id = p_payment for update;
  if not found then raise exception 'payment % not found', p_payment; end if;
  if not public.can_access_org(pay.organization_id) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;
  if pay.status not in ('submitted', 'under_review') then
    raise exception 'payment already decided (status: %)', pay.status;
  end if;

  perform set_config('app.billing_lifecycle', 'allowed', true);

  update public.payments
     set status = case when decision = 'approved'
                       then 'approved'::public.payment_status
                       else 'rejected'::public.payment_status end,
         reviewed_by = auth.uid(), reviewed_at = now(), review_note = note
   where id = p_payment;

  if decision = 'approved' then
    if pay.invoice_id is not null then
      select i.* into inv from public.invoices i
       where i.id = pay.invoice_id for update;
      new_paid := inv.amount_paid_cents + pay.amount_cents;
      update public.invoices
         set amount_paid_cents = new_paid,
             status = case when new_paid >= inv.total_cents
                           then 'paid'::public.invoice_status
                           else 'partially_paid'::public.invoice_status end
       where id = pay.invoice_id;
    elsif pay.method = 'wallet_topup' then
      insert into public.wallet_accounts (organization_id)
      values (pay.organization_id)
      on conflict (organization_id) do nothing;

      select w.* into wallet from public.wallet_accounts w
       where w.organization_id = pay.organization_id for update;

      insert into public.wallet_ledger_entries
        (wallet_account_id, entry_type, amount_cents, balance_after_cents,
         reference, related_payment_id, idempotency_key, actor_id)
      values (wallet.id, 'credit', pay.amount_cents,
              wallet.balance_cents + pay.amount_cents,
              coalesce(pay.reference, 'wallet top-up'), p_payment,
              'payment:' || p_payment::text, auth.uid());

      update public.wallet_accounts
         set balance_cents = wallet.balance_cents + pay.amount_cents
       where id = wallet.id;
    end if;
  end if;

  perform set_config('app.billing_lifecycle', '', true);

  perform public.log_audit_event(auth.uid(), pay.organization_id,
    'payment.' || decision, 'payment', p_payment::text,
    jsonb_build_object('amount_cents', pay.amount_cents, 'note', note));
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.quotations enable row level security;
alter table public.quotation_versions enable row level security;
alter table public.quotation_line_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.payments enable row level security;
alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger_entries enable row level security;

-- Quotations: clients see sent+ statuses; staff see drafts too.
create policy "quotations: tenant access" on public.quotations
  for select to authenticated
  using (
    public.can_access_org(organization_id)
    and ((select public.is_staff())
         or status in ('requested', 'sent', 'viewed', 'changes_requested',
                       'accepted', 'declined', 'expired', 'converted'))
  );

create policy "quotations: clients request, staff draft" on public.quotations
  for insert to authenticated
  with check (
    (public.is_org_member(organization_id)
     and status = 'requested'
     and requested_by = (select auth.uid()))
    or (public.has_permission('quotations.create')
        and public.can_access_org(organization_id))
  );

create policy "quotations: staff edit metadata" on public.quotations
  for update to authenticated
  using (public.has_permission('quotations.create')
         and public.can_access_org(organization_id))
  with check (public.has_permission('quotations.create')
              and public.can_access_org(organization_id));

create policy "quotation versions: via parent" on public.quotation_versions
  for select to authenticated
  using (exists (select 1 from public.quotations q
                  where q.id = quotation_id
                    and public.can_access_org(q.organization_id)));

create policy "quotation versions: staff add" on public.quotation_versions
  for insert to authenticated
  with check (
    public.has_permission('quotations.create')
    and exists (select 1 from public.quotations q
                 where q.id = quotation_id
                   and public.can_access_org(q.organization_id))
  );

create policy "quotation items: via version" on public.quotation_line_items
  for select to authenticated
  using (exists (
    select 1 from public.quotation_versions v
    join public.quotations q on q.id = v.quotation_id
    where v.id = quotation_version_id
      and public.can_access_org(q.organization_id)));

create policy "quotation items: staff manage" on public.quotation_line_items
  for all to authenticated
  using (
    public.has_permission('quotations.create')
    and exists (
      select 1 from public.quotation_versions v
      join public.quotations q on q.id = v.quotation_id
      where v.id = quotation_version_id
        and public.can_access_org(q.organization_id)))
  with check (
    public.has_permission('quotations.create')
    and exists (
      select 1 from public.quotation_versions v
      join public.quotations q on q.id = v.quotation_id
      where v.id = quotation_version_id
        and public.can_access_org(q.organization_id)));

-- Invoices: clients never see drafts.
create policy "invoices: tenant access" on public.invoices
  for select to authenticated
  using (
    public.can_access_org(organization_id)
    and ((select public.is_staff()) or status <> 'draft')
  );

create policy "invoices: staff create drafts" on public.invoices
  for insert to authenticated
  with check (
    public.has_permission('invoices.create')
    and public.can_access_org(organization_id)
    and status = 'draft'
  );

create policy "invoices: staff edit drafts" on public.invoices
  for update to authenticated
  using (public.has_permission('invoices.create')
         and public.can_access_org(organization_id))
  with check (public.has_permission('invoices.create')
              and public.can_access_org(organization_id));

create policy "invoice items: via parent" on public.invoice_line_items
  for select to authenticated
  using (exists (
    select 1 from public.invoices i
     where i.id = invoice_id
       and public.can_access_org(i.organization_id)
       and ((select public.is_staff()) or i.status <> 'draft')));

create policy "invoice items: staff manage drafts" on public.invoice_line_items
  for all to authenticated
  using (
    public.has_permission('invoices.create')
    and exists (select 1 from public.invoices i
                 where i.id = invoice_id
                   and public.can_access_org(i.organization_id)))
  with check (
    public.has_permission('invoices.create')
    and exists (select 1 from public.invoices i
                 where i.id = invoice_id
                   and public.can_access_org(i.organization_id)));

-- Payments: clients submit proof for their own org.
create policy "payments: tenant access" on public.payments
  for select to authenticated
  using (public.can_access_org(organization_id));

create policy "payments: members submit proof" on public.payments
  for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'submitted'
    and public.is_org_member(organization_id)
    and (invoice_id is null or exists (
      select 1 from public.invoices i
       where i.id = invoice_id
         and i.organization_id = organization_id
         and i.status in ('sent', 'viewed', 'partially_paid', 'overdue')))
  );

-- Wallet: read-only for the tenant; every mutation flows through functions.
create policy "wallets: tenant access" on public.wallet_accounts
  for select to authenticated
  using (public.can_access_org(organization_id));

create policy "ledger: tenant access" on public.wallet_ledger_entries
  for select to authenticated
  using (exists (select 1 from public.wallet_accounts w
                  where w.id = wallet_account_id
                    and public.can_access_org(w.organization_id)));

-- ============================================================
-- 20260718100000_communication.sql
-- ============================================================
-- ProGuidance Portal — Phase 6: support tickets & project messages.
-- Spec §6.10: departments, status machine, internal staff notes invisible
-- to clients, closed tickets read-only unless explicitly reopened.

create type public.ticket_status as enum (
  'open', 'assigned', 'waiting_client', 'waiting_staff',
  'resolved', 'closed', 'reopened'
);

create sequence public.ticket_number_seq;

create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  company_id uuid references public.companies (id) on delete set null,
  ticket_number text not null unique
    default ('PG-TIC-' || lpad(nextval('public.ticket_number_seq')::text, 6, '0')),
  department text not null check (department in (
    'sales', 'order_support', 'documents', 'accounting_invoice',
    'marketplace_support', 'technical_support', 'compliance_tax',
    'general_support'
  )),
  subject text not null check (char_length(subject) between 1 and 200),
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  status public.ticket_status not null default 'open',
  created_by uuid references auth.users (id) on delete set null,
  assigned_to uuid references public.profiles (id) on delete set null,
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tickets_org_idx on public.tickets (organization_id);
create index tickets_status_idx on public.tickets (status);
create index tickets_assigned_idx on public.tickets (assigned_to);

create trigger tickets_set_updated_at
  before update on public.tickets
  for each row execute function public.set_updated_at();

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.tickets (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index ticket_messages_ticket_idx
  on public.ticket_messages (ticket_id, created_at);

create table public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  author_id uuid references auth.users (id) on delete set null,
  body text not null check (char_length(body) between 1 and 10000),
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index project_messages_project_idx
  on public.project_messages (project_id, created_at);

-- ---------------------------------------------------------------------------
-- Ticket lifecycle: status changes only through functions.
-- ---------------------------------------------------------------------------

create or replace function public.protect_ticket_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null
     or coalesce(current_setting('app.ticket_lifecycle', true), '') = 'allowed' then
    return new;
  end if;
  if new.status is distinct from old.status
     or new.assigned_to is distinct from old.assigned_to then
    raise exception 'ticket status/assignment changes only through ticket functions'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger tickets_protect
  before update on public.tickets
  for each row execute function public.protect_ticket_columns();

-- Reply with automatic status flow. Internal notes are staff-only and never
-- change the client-facing status. Closed tickets reject replies; a client
-- reply on a resolved ticket reopens it.
create or replace function public.reply_ticket(
  p_ticket uuid,
  p_body text,
  p_internal boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tick public.tickets%rowtype;
  staff boolean;
begin
  select t.* into tick from public.tickets t where t.id = p_ticket for update;
  if not found then raise exception 'ticket % not found', p_ticket; end if;

  staff := public.is_staff();

  if not public.has_permission('tickets.reply') then
    raise exception 'permission denied: tickets.reply required'
      using errcode = '42501';
  end if;
  if staff then
    if not public.can_access_org(tick.organization_id) then
      raise exception 'permission denied: no access to this organization'
        using errcode = '42501';
    end if;
  else
    if not public.is_org_member(tick.organization_id) then
      raise exception 'permission denied: not a member of this organization'
        using errcode = '42501';
    end if;
    if p_internal then
      raise exception 'internal notes are staff-only' using errcode = '42501';
    end if;
  end if;

  if tick.status = 'closed' then
    raise exception 'closed tickets are read-only; reopen it first';
  end if;

  if p_body is null or char_length(trim(p_body)) = 0 then
    raise exception 'message body is required';
  end if;

  insert into public.ticket_messages (ticket_id, author_id, body, is_internal)
  values (p_ticket, auth.uid(), p_body, p_internal);

  if not p_internal then
    perform set_config('app.ticket_lifecycle', 'allowed', true);
    update public.tickets
       set status = case
         when not staff and tick.status = 'resolved'
           then 'reopened'::public.ticket_status
         when not staff then 'waiting_staff'::public.ticket_status
         else 'waiting_client'::public.ticket_status
       end
     where id = p_ticket;
    perform set_config('app.ticket_lifecycle', '', true);
  end if;
end;
$$;

-- Staff status controls: assign (tickets.assign), resolve/close
-- (tickets.close), reopen (member or staff in scope).
create or replace function public.set_ticket_status(
  p_ticket uuid,
  new_status public.ticket_status,
  assignee uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  tick public.tickets%rowtype;
begin
  select t.* into tick from public.tickets t where t.id = p_ticket for update;
  if not found then raise exception 'ticket % not found', p_ticket; end if;

  if new_status = 'assigned' then
    if not public.has_permission('tickets.assign')
       or not public.can_access_org(tick.organization_id) then
      raise exception 'permission denied: tickets.assign required'
        using errcode = '42501';
    end if;
    if assignee is null then
      raise exception 'assignment needs an assignee';
    end if;
  elsif new_status in ('resolved', 'closed') then
    if not public.has_permission('tickets.close')
       or not public.can_access_org(tick.organization_id) then
      raise exception 'permission denied: tickets.close required'
        using errcode = '42501';
    end if;
  elsif new_status = 'reopened' then
    if not (public.is_org_member(tick.organization_id)
            or (public.is_staff()
                and public.can_access_org(tick.organization_id))) then
      raise exception 'permission denied' using errcode = '42501';
    end if;
    if tick.status not in ('resolved', 'closed') then
      raise exception 'only resolved or closed tickets can be reopened';
    end if;
  else
    raise exception 'unsupported status change to %', new_status;
  end if;

  perform set_config('app.ticket_lifecycle', 'allowed', true);
  update public.tickets
     set status = new_status,
         assigned_to = case when new_status = 'assigned' then assignee
                            else assigned_to end,
         closed_at = case when new_status = 'closed' then now()
                          when new_status = 'reopened' then null
                          else closed_at end
   where id = p_ticket;
  perform set_config('app.ticket_lifecycle', '', true);

  perform public.log_audit_event(auth.uid(), tick.organization_id,
    'ticket.' || new_status, 'ticket', p_ticket::text,
    jsonb_build_object('assignee', assignee));
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.project_messages enable row level security;

create policy "tickets: tenant access" on public.tickets
  for select to authenticated
  using (public.can_access_org(organization_id));

create policy "tickets: members open" on public.tickets
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and status = 'open'
    and (public.is_org_member(organization_id)
         or (public.has_permission('tickets.reply')
             and (select public.is_staff())
             and public.can_access_org(organization_id)))
  );

-- Internal notes never reach clients (spec §6.10).
create policy "ticket messages: visible except internal for clients"
  on public.ticket_messages for select
  to authenticated
  using (
    exists (select 1 from public.tickets t
             where t.id = ticket_id
               and public.can_access_org(t.organization_id))
    and (not is_internal or (select public.is_staff()))
  );

create policy "project messages: visible except internal for clients"
  on public.project_messages for select
  to authenticated
  using (
    exists (select 1 from public.projects p
             where p.id = project_id
               and public.can_access_org(p.organization_id))
    and (not is_internal or (select public.is_staff()))
  );

create policy "project messages: participants post" on public.project_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.projects p
       where p.id = project_id
         and (
           (public.is_org_member(p.organization_id) and not is_internal)
           or ((select public.is_staff())
               and public.can_access_org(p.organization_id))
         )
    )
  );
-- ticket_messages inserts happen only inside reply_ticket().

-- ============================================================
-- 20260718110000_notifications_content.sql
-- ============================================================
-- ProGuidance Portal — Phase 7: in-app notifications (event-driven),
-- email outbox, notification preferences, Help Center, perks. Spec §6.11–§6.12.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  organization_id uuid references public.organizations (id) on delete cascade,
  type text not null check (type in (
    'action_required', 'document', 'project', 'message', 'billing',
    'quotation', 'support', 'compliance', 'security', 'announcement'
  )),
  title text not null check (char_length(title) between 1 and 200),
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx
  on public.notifications (user_id, read_at, created_at desc);

create table public.notification_preferences (
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null,
  email_enabled boolean not null default true,
  primary key (user_id, category)
);

-- Queued outbox: emails are NEVER sent inside a transaction; a worker with
-- SMTP/Resend credentials drains 'pending' rows with retries. Without
-- credentials rows simply wait — nothing is faked.
create table public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  body text not null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index email_outbox_status_idx on public.email_outbox (status, created_at);

create table public.help_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  sort integer not null default 0
);

create table public.help_articles (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.help_categories (id) on delete cascade,
  title text not null,
  slug text not null unique,
  body text not null,
  is_published boolean not null default false,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);

create index help_articles_category_idx on public.help_articles (category_id);

create table public.perks_resources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  description text not null,
  benefit text,
  url text,
  disclosure text,
  is_published boolean not null default false,
  sort integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Notification helpers (SECURITY DEFINER — the only write paths)
-- ---------------------------------------------------------------------------

create or replace function public.notify_user(
  target uuid,
  n_type text,
  n_title text,
  n_body text default null,
  n_link text default null,
  org uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, organization_id, type, title, body, link)
  values (target, org, n_type, n_title, n_body, n_link);
$$;

create or replace function public.notify_org_members(
  org uuid,
  n_type text,
  n_title text,
  n_body text default null,
  n_link text default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, organization_id, type, title, body, link)
  select m.user_id, org, n_type, n_title, n_body, n_link
    from public.organization_memberships m
    join public.profiles p on p.id = m.user_id and p.status = 'active'
   where m.organization_id = org;
$$;

-- Admin composer: audience is an organization's members; requires the
-- notifications.send permission and is audited.
create or replace function public.send_org_announcement(
  org uuid,
  n_title text,
  n_body text default null,
  n_link text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('notifications.send') then
    raise exception 'permission denied: notifications.send required'
      using errcode = '42501';
  end if;
  if not public.can_access_org(org) then
    raise exception 'permission denied: no access to this organization'
      using errcode = '42501';
  end if;
  perform public.notify_org_members(org, 'announcement', n_title, n_body, n_link);
  perform public.log_audit_event(auth.uid(), org, 'notification.sent',
    'organization', org::text, jsonb_build_object('title', n_title));
end;
$$;

-- ---------------------------------------------------------------------------
-- Event triggers
-- ---------------------------------------------------------------------------

-- Registration decision → notify the user; approval also queues a
-- mandatory security email in the outbox.
create or replace function public.notify_registration_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'pending_approval' and new.status = 'active' then
    perform public.notify_user(new.id, 'security',
      'Your ProGuidance account is approved',
      'Welcome aboard — your portal access is now active.', '/dashboard');
    insert into public.email_outbox (to_email, subject, body, idempotency_key)
    values (new.email, 'Your ProGuidance account is approved',
            'Your registration was approved. Sign in at your portal to get started.',
            'registration-approved:' || new.id)
    on conflict (idempotency_key) do nothing;
  elsif old.status = 'pending_approval' and new.status = 'rejected' then
    perform public.notify_user(new.id, 'security',
      'Your ProGuidance registration was not approved', null, null);
  end if;
  return new;
end;
$$;

create trigger profiles_notify_decision
  after update on public.profiles
  for each row execute function public.notify_registration_decision();

-- Client-visible project updates → notify org members.
create or replace function public.notify_project_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  org uuid;
begin
  if new.client_visible then
    select p.organization_id into org from public.projects p
     where p.id = new.project_id;
    perform public.notify_org_members(org, 'project',
      'Project update: ' || replace(new.to_status::text, '_', ' '),
      new.note, '/projects/' || new.project_id || '?tab=timeline');
  end if;
  return new;
end;
$$;

create trigger project_history_notify
  after insert on public.project_status_history
  for each row execute function public.notify_project_update();

-- New data request → notify org members (action required).
create or replace function public.notify_data_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.notify_org_members(new.organization_id, 'action_required',
    'Information requested: ' || new.title, new.description, '/requests');
  return new;
end;
$$;

create trigger data_requests_notify
  after insert on public.data_requests
  for each row execute function public.notify_data_request();

-- Document review decision → notify the uploader.
create or replace function public.notify_document_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.review_status in ('approved', 'rejected')
     and new.review_status is distinct from old.review_status
     and new.uploaded_by is not null then
    perform public.notify_user(new.uploaded_by, 'document',
      'Document ' || new.review_status || ': ' || new.title,
      new.review_note, '/documents', new.organization_id);
  end if;
  return new;
end;
$$;

create trigger documents_notify_review
  after update on public.documents
  for each row execute function public.notify_document_review();

-- Invoice issued → notify org members.
create or replace function public.notify_invoice_issued()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.status = 'draft' and new.status = 'sent' then
    perform public.notify_org_members(new.organization_id, 'billing',
      'Invoice ' || new.invoice_number || ' issued',
      'Amount due: $' || (new.total_cents / 100.0)::numeric(12,2),
      '/invoices/' || new.id);
  end if;
  return new;
end;
$$;

create trigger invoices_notify_issue
  after update on public.invoices
  for each row execute function public.notify_invoice_issued();

-- Payment decision → notify the submitter.
create or replace function public.notify_payment_review()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status in ('approved', 'rejected')
     and new.status is distinct from old.status
     and new.submitted_by is not null then
    perform public.notify_user(new.submitted_by, 'billing',
      'Payment ' || new.status,
      'Amount: $' || (new.amount_cents / 100.0)::numeric(12,2),
      '/payments', new.organization_id);
  end if;
  return new;
end;
$$;

create trigger payments_notify_review
  after update on public.payments
  for each row execute function public.notify_payment_review();

-- Quotation sent → notify org members.
create or replace function public.notify_quotation_sent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'sent' and old.status is distinct from new.status then
    perform public.notify_org_members(new.organization_id, 'quotation',
      'Quotation ready: ' || new.title, null, '/quotations/' || new.id);
  end if;
  return new;
end;
$$;

create trigger quotations_notify_sent
  after update on public.quotations
  for each row execute function public.notify_quotation_sent();

-- Public staff ticket reply → notify org members.
create or replace function public.notify_ticket_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tick public.tickets%rowtype;
  author_is_staff boolean;
begin
  if new.is_internal then
    return new;
  end if;
  select t.* into tick from public.tickets t where t.id = new.ticket_id;
  select exists (
    select 1 from public.profiles p
     where p.id = new.author_id
       and p.role in ('administrator', 'manager', 'moderator')
  ) into author_is_staff;
  if author_is_staff then
    perform public.notify_org_members(tick.organization_id, 'support',
      'Reply on ' || tick.ticket_number || ': ' || tick.subject,
      null, '/tickets/' || tick.id);
  end if;
  return new;
end;
$$;

create trigger ticket_messages_notify
  after insert on public.ticket_messages
  for each row execute function public.notify_ticket_reply();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.email_outbox enable row level security;
alter table public.help_categories enable row level security;
alter table public.help_articles enable row level security;
alter table public.perks_resources enable row level security;

create policy "notifications: own" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "notifications: mark own read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "notification prefs: own" on public.notification_preferences
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "outbox: settings managers read" on public.email_outbox
  for select to authenticated
  using (public.has_permission('settings.manage'));

create policy "help categories: readable" on public.help_categories
  for select to authenticated using (true);
create policy "help categories: manage" on public.help_categories
  for all to authenticated
  using (public.has_permission('content.manage'))
  with check (public.has_permission('content.manage'));

create policy "help articles: published or managers" on public.help_articles
  for select to authenticated
  using (is_published or public.has_permission('content.manage'));
create policy "help articles: manage" on public.help_articles
  for all to authenticated
  using (public.has_permission('content.manage'))
  with check (public.has_permission('content.manage'));

create policy "perks: published or managers" on public.perks_resources
  for select to authenticated
  using (is_published or public.has_permission('content.manage'));
create policy "perks: manage" on public.perks_resources
  for all to authenticated
  using (public.has_permission('content.manage'))
  with check (public.has_permission('content.manage'));

-- ---------------------------------------------------------------------------
-- Seed: Help Center content (published — never a blank production page)
-- and demonstration perks (published with clear disclosure).
-- ---------------------------------------------------------------------------

insert into public.help_categories (id, name, slug, sort) values
  ('00000000-0000-4000-f000-000000000001', 'US Formation', 'us-formation', 1),
  ('00000000-0000-4000-f000-000000000002', 'Documents', 'documents', 2),
  ('00000000-0000-4000-f000-000000000003', 'Billing & Invoices', 'billing', 3),
  ('00000000-0000-4000-f000-000000000004', 'Marketplace Setup', 'marketplace', 4),
  ('00000000-0000-4000-f000-000000000005', 'Account & Security', 'account-security', 5);

insert into public.help_articles (category_id, title, slug, body, is_published, sort) values
  ('00000000-0000-4000-f000-000000000001', 'How US LLC formation works with ProGuidance', 'how-llc-formation-works',
   E'Order the USA LLC Formation service from the catalogue and your order becomes a tracked project.\n\n1. We review your order and confirm details.\n2. You provide owner information through data requests.\n3. We prepare and submit the state filing.\n4. You receive formation documents in your secure vault.\n\nGovernment fees are billed separately at actual cost. Timelines depend on the state — your project timeline always shows the current stage and whose action is next. ProGuidance provides professional processing support; state approval decisions rest with the authority.', true, 1),
  ('00000000-0000-4000-f000-000000000001', 'Choosing a formation state', 'choosing-a-formation-state',
   E'Wyoming, Delaware, and Florida are popular for non-resident founders, but the right choice depends on your business. Consider filing fees, annual report costs, and where you actually operate.\n\nThis article is general information, not legal or tax advice — confirm suitability with a qualified professional. Our team can share practical experience for your situation through a support ticket.', true, 2),
  ('00000000-0000-4000-f000-000000000002', 'Uploading documents securely', 'uploading-documents-securely',
   E'Use the Document Vault to upload PDFs and images up to 25 MB. Every file is stored privately, virus-scanned, and reviewed by our team before it is marked approved.\n\nIf a document is rejected you will see the reason and can upload a new version — earlier versions are always preserved. Downloads use short-lived secure links; there are no public file URLs.', true, 1),
  ('00000000-0000-4000-f000-000000000003', 'Understanding your invoice', 'understanding-your-invoice',
   E'ProGuidance invoices are USD only and use the PG-INV- number series. Professional fees and government/third-party fees are always listed separately.\n\nPay by bank transfer or Wise, then submit the payment proof from the invoice page. Our team verifies every payment before the balance updates — you will receive a notification either way.', true, 1),
  ('00000000-0000-4000-f000-000000000003', 'How the USD wallet works', 'how-the-wallet-works',
   E'The wallet holds USD credit backed by an append-only ledger. Request a top-up, send the funds, and submit the reference — the balance updates once our team verifies the transfer. Every movement appears in your transactions list with a running balance.', true, 2),
  ('00000000-0000-4000-f000-000000000004', 'Preparing for marketplace account setup', 'preparing-marketplace-setup',
   E'Amazon and Walmart seller onboarding needs consistent business details: company documents, EIN confirmation, a US address, and matching bank details.\n\nStart the relevant service from the catalogue and respond promptly to data requests — mismatched details are the most common cause of marketplace verification delays. Marketplace approval decisions are made by the platforms and are outside ProGuidance''s control.', true, 1),
  ('00000000-0000-4000-f000-000000000005', 'Keeping your account secure', 'keeping-your-account-secure',
   E'Use a unique 12+ character password and enable two-factor authentication in Security settings. Revoke sessions you do not recognize.\n\nProGuidance staff will never ask for your password. Security-critical emails (like registration approval) are always sent regardless of notification preferences.', true, 1),
  ('00000000-0000-4000-f000-000000000005', 'Getting help fast', 'getting-help-fast',
   E'Open a support ticket in the department that matches your question — Sales, Order Support, Documents, Accounting/Invoice, Marketplace Support, Technical Support, Compliance/Tax, or General Support.\n\nProject-specific questions go in the project workspace Messages tab so the assigned team sees them with full context.', true, 2);

insert into public.perks_resources (name, category, description, benefit, url, disclosure, is_published, sort) values
  ('Wise Business', 'Banking', 'Multi-currency business account popular with US companies owned by international founders.', 'Hold and convert USD alongside other currencies.', 'https://wise.com', 'Demonstration listing seeded by the portal build — the owner should confirm partnership terms before relying on it. May contain affiliate relationships.', true, 1),
  ('Payoneer', 'Payments', 'Receive marketplace payouts from Amazon, Walmart, and other platforms.', 'Marketplace-friendly USD receiving accounts.', 'https://payoneer.com', 'Demonstration listing seeded by the portal build — the owner should confirm partnership terms before relying on it. May contain affiliate relationships.', true, 2),
  ('Northwest Registered Agent', 'Compliance', 'Registered agent service coverage across all US states.', 'Reliable registered agent coverage for multi-state needs.', 'https://www.northwestregisteredagent.com', 'Demonstration listing seeded by the portal build — the owner should confirm partnership terms before relying on it. May contain affiliate relationships.', true, 3);
