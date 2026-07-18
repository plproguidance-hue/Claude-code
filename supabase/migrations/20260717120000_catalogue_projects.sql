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
