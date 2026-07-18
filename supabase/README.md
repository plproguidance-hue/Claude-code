# Supabase — local development & migrations

## Local stack (owner machine; requires Docker)

```sh
# 1. Install the Supabase CLI: https://supabase.com/docs/guides/cli
# 2. From the repository root:
supabase start          # boots Postgres, Auth, Storage, Studio, Inbucket
supabase db reset       # applies supabase/migrations/* then seed.sql

# 3. Copy the printed API URL and anon key into .env.local:
#    NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=<printed anon key>
npm run dev
```

- Studio: http://127.0.0.1:54323 — Inbucket (captured auth emails): http://127.0.0.1:54324
- Demo logins (seed.sql, password `ProGuidance-Dev-2026!`):
  `admin@`, `manager@`, `moderator@`, `client.alpha@`, `client.beta@`,
  `pending.client@` — all `…@proguidance.dev`. The seed is development-only
  fixture data; never apply it to production.

> The automated build container for this repository has no Docker daemon, so
> `supabase start` was **not** exercised there. Migrations are instead applied
> and tested against plain PostgreSQL 16 with a faithful `auth.*` shim
> (`tests/integration/supabase-shim.sql`) by the integration suite — the same
> migration files run unmodified in both environments.

## Hosted project

1. Create a project at https://supabase.com, then link and push:
   ```sh
   supabase link --project-ref <ref>
   supabase db push        # applies supabase/migrations/*
   ```
2. Set Auth → URL Configuration: site URL and the
   `/auth/callback` + `/auth/confirm` redirect URLs for your domain.
3. Enable email confirmations. Do **not** run seed.sql.
4. Bootstrap the first administrator: sign up normally, then in the SQL
   editor (service context):
   ```sql
   update public.profiles
      set role = 'administrator', status = 'active'
    where email = 'owner@example.com';
   ```
   Every later registration is approved from `/admin/registrations`.

## Migration inventory

| File | Contents |
| --- | --- |
| `20260717090000_foundation.sql` | Enums, tables (organizations, profiles, memberships, staff assignments, permissions, overrides, invitations, audit, settings), authorization helper functions, registration lifecycle triggers, `approve_registration()`, private `documents` bucket (Supabase only). |
| `20260717090100_rls.sql` | RLS enabled on every table + default-deny policy set. |
| `20260717090200_seed_permissions.sql` | Permission catalogue + default role grants (kept in sync with `src/lib/auth/permissions.ts` by a unit test). |
| `20260717110000_companies.sql` | Phase 2: companies, owners/members, USA-only company addresses, compliance deadlines, reviewed update requests (`review_company_update_request()`), draft-lifecycle protection triggers, `invitation_preview()`, international profile contact columns, RLS for all of it. |
| `20260717120000_catalogue_projects.sql` | Phase 3: service catalogue + plans (19 §6.4 seed services flagged for price verification; demo plans unpublished), projects with PG-ORD numbering, configurable `project_status_transitions` + audited `transition_project()`, status history with staff-only visibility, data requests with versioned submissions (`submit_data_request()`, `review_data_request()`), RLS throughout. |
| `20260717130000_documents.sql` | Phase 4: documents/document_versions/document_reviews with hard-quarantine default, resubmission re-quarantine trigger, `mark_document_scanned()` (system/admin), administrator-only `release_quarantined_document()`, `review_document()` with mandatory rejection reasons, staff-only visibility, and RLS. The private `documents` bucket keeps zero storage policies — default deny; all file access is server-authorized signed URLs. |
