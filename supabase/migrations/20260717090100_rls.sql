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
