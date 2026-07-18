# Go-live checklist — hosted Supabase project `nbeipbxdyyhzfbueovnq`

Owner-driven setup (~10 minutes). Nothing here requires sharing secrets with
anyone: keys go straight from the Supabase dashboard into your deployment
platform.

## 1. Apply the schema (once)

Open the SQL Editor:
https://supabase.com/dashboard/project/nbeipbxdyyhzfbueovnq/sql/new

Paste the entire contents of **`docs/deploy/hosted-setup.sql`** and Run.
It creates every table, role/permission seed, RLS policy, trigger, and the
private `documents` bucket — identical to the tested migrations. Expect
"Success. No rows returned".

> Run it once only. If it half-fails (e.g. a copy/paste miss), easiest reset
> for a fresh project: Dashboard → Settings → General → Reset database, then
> paste again.

## 2. Auth settings

Authentication → Sign In / Up:
- Email provider **enabled**, "Confirm email" **ON** (required — the portal
  assumes verified emails).

Authentication → URL Configuration (revisit after step 4 with your real
domain):
- Site URL: `https://<your-portal-domain>`
- Additional redirect URLs:
  - `https://<your-portal-domain>/auth/callback`
  - `https://<your-portal-domain>/auth/confirm`

## 3. Bootstrap your administrator account

1. Deploy the app (step 4) or run it locally against this project, then
   **register yourself** through `/register` and click the verification email.
2. In the SQL Editor, promote your account (replace the email):

```sql
update public.profiles
   set role = 'administrator', status = 'active'
 where email = 'you@example.com';
```

Every later registration is then approved inside the portal at
`/admin/registrations` — this SQL is needed exactly once.

## 4. Deploy the app (Vercel shown; any Node host works)

1. Import the GitHub repo `plproguidance-hue/Claude-code`, branch
   `claude/portal-phase-1-foundation-xuvrdh`.
2. Environment variables (values from Dashboard → Settings → API Keys):

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://nbeipbxdyyhzfbueovnq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the **anon / publishable** key |
| `SUPABASE_SERVICE_ROLE_KEY` | the **service_role / secret** key — server-side only; never expose it anywhere else |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-portal-domain>` |

3. Deploy, then finish step 2's URL configuration with the real domain.

## 5. Smoke test (5 minutes)

1. `/register` → verification email arrives → after clicking, you land on
   the **pending approval** page (expected!).
2. Promote yourself via step 3's SQL → refresh → dashboard loads.
3. `/admin/registrations`, `/admin/catalogue` (19 seeded services),
   `/services` → place a test order → `/admin/projects` → transition it.
4. `/documents` → upload a small PDF. With no virus scanner configured it
   will report **quarantined — that is correct behaviour**; release it from
   `/admin/documents/review`, approve it, then download via the signed URL.

## Optional

- **Virus scanning:** set `VIRUS_SCAN_PROVIDER=clamav` + `CLAMAV_HOST/PORT`
  where a ClamAV instance is reachable; otherwise every upload waits in
  quarantine for an administrator (safe default).
- **Demo data:** `supabase/seed.sql` creates demo logins with a published
  password — fine for a throwaway preview project, but never run it on the
  real production project.
- **Custom domain** `portal.proguidancetechsolution.com`: add it in Vercel,
  then update `NEXT_PUBLIC_SITE_URL` and the auth URLs.
