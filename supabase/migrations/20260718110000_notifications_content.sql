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
