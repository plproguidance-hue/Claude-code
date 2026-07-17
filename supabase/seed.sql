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
end;
$$;
