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
