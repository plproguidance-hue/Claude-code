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
