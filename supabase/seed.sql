-- LOCAL DEVELOPMENT SEED — sanitized demonstration fixtures only.
-- Applied by `supabase db reset` after migrations. Never run in production:
-- it creates demo credentials. Contains no real client PII, EINs, or
-- identity data (MASTER BUILD PROMPT §2).
--
-- Demo password for every account below: ProGuidance-Dev-2026!

do $$
declare
  admin_id constant uuid := '00000000-0000-4000-a000-000000000001';
  manager_id constant uuid := '00000000-0000-4000-a000-000000000002';
  moderator_id constant uuid := '00000000-0000-4000-a000-000000000003';
  client_alpha_id constant uuid := '00000000-0000-4000-a000-000000000011';
  client_beta_id constant uuid := '00000000-0000-4000-a000-000000000012';
  pending_id constant uuid := '00000000-0000-4000-a000-000000000013';
  org_alpha constant uuid := '00000000-0000-4000-b000-000000000001';
  org_beta constant uuid := '00000000-0000-4000-b000-000000000002';
begin
  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at
  )
  select
    v.id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    v.email,
    crypt('ProGuidance-Dev-2026!', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v.full_name),
    now(),
    now()
  from (
    values
      (admin_id, 'admin@proguidance.dev', 'Avery Admin'),
      (manager_id, 'manager@proguidance.dev', 'Morgan Manager'),
      (moderator_id, 'moderator@proguidance.dev', 'Micah Moderator'),
      (client_alpha_id, 'client.alpha@proguidance.dev', 'Casey Alpha'),
      (client_beta_id, 'client.beta@proguidance.dev', 'Blake Beta'),
      (pending_id, 'pending.client@proguidance.dev', 'Payton Pending')
  ) as v(id, email, full_name)
  on conflict (id) do nothing;

  -- handle_new_user created pending 'client' profiles; promote demo staff and
  -- activate demo clients. Superuser seed context (auth.uid() is null) is
  -- exempt from the profile-protection trigger by design.
  update public.profiles set role = 'administrator', status = 'active'
   where id = admin_id;
  update public.profiles set role = 'manager', status = 'active'
   where id = manager_id;
  update public.profiles set role = 'moderator', status = 'active'
   where id = moderator_id;
  update public.profiles set status = 'active'
   where id in (client_alpha_id, client_beta_id);
  -- pending.client stays pending_approval for testing the approval queue.

  insert into public.organizations (id, name, slug, created_by) values
    (org_alpha, 'Alpha Ventures LLC (Demo)', 'alpha-ventures-demo', admin_id),
    (org_beta, 'Beta Holdings Inc (Demo)', 'beta-holdings-demo', admin_id)
  on conflict (id) do nothing;

  insert into public.organization_memberships (organization_id, user_id, is_owner)
  values
    (org_alpha, client_alpha_id, true),
    (org_beta, client_beta_id, true)
  on conflict do nothing;

  -- Manager and moderator are assigned to Alpha only: Beta must remain
  -- invisible to them (assigned-scope rule).
  insert into public.staff_assignments (organization_id, user_id, assigned_by)
  values
    (org_alpha, manager_id, admin_id),
    (org_alpha, moderator_id, admin_id)
  on conflict do nothing;

  -- Demo company for Alpha (sanitized fixture data, fake EIN pattern).
  insert into public.companies
    (id, organization_id, legal_name, dba, entity_type, formation_state,
     formation_date, ein, registered_agent_name, business_purpose, status,
     onboarding_mode, wizard_step, created_by, submitted_at)
  values
    ('00000000-0000-4000-c000-000000000001', org_alpha,
     'Alpha Ventures LLC', 'AlphaShop', 'llc', 'WY', '2025-03-14',
     '98-7654321', 'Demo Agent Services LLC',
     'E-commerce retail and digital services (demonstration record)',
     'active', 'transfer', 6, client_alpha_id, now())
  on conflict (id) do nothing;

  insert into public.company_owners_members
    (company_id, full_name, role_title, ownership_percent, email, country)
  values
    ('00000000-0000-4000-c000-000000000001', 'Casey Alpha', 'Managing Member',
     100, 'client.alpha@proguidance.dev', 'US')
  on conflict do nothing;

  insert into public.company_addresses
    (company_id, kind, line1, city, state, postal_code)
  values
    ('00000000-0000-4000-c000-000000000001', 'business',
     '1200 Demo Street Ste 5', 'Sheridan', 'WY', '82801'),
    ('00000000-0000-4000-c000-000000000001', 'registered',
     '30 N Demo Ave', 'Sheridan', 'WY', '82801')
  on conflict do nothing;

  insert into public.company_compliance_deadlines
    (company_id, title, kind, due_date, notes, created_by)
  values
    ('00000000-0000-4000-c000-000000000001', 'Wyoming annual report',
     'annual_report', (current_date + interval '60 days')::date,
     'Demonstration deadline', admin_id)
  on conflict do nothing;
end;
$$;
