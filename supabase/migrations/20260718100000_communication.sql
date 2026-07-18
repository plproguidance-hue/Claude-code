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
