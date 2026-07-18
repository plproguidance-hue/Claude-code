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
