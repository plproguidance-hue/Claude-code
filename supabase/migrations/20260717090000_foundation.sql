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
