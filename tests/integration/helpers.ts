import { Pool, type PoolClient } from "pg";

import { testDbUrl } from "./global-setup";

let pool: Pool | undefined;

export function getPool(): Pool {
  pool ??= new Pool({ connectionString: testDbUrl(), max: 4 });
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.end();
  pool = undefined;
}

export type Actor = { kind: "anon" } | { kind: "user"; id: string };

export const anon: Actor = { kind: "anon" };
export const user = (id: string): Actor => ({ kind: "user", id });

/**
 * Runs `fn` inside a rolled-back transaction impersonating a Supabase API
 * request: `SET LOCAL ROLE` to anon/authenticated plus the request JWT
 * claims, exactly as PostgREST does. Rolling back keeps fixtures pristine
 * between tests.
 */
export async function actAs<T>(
  actor: Actor,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    if (actor.kind === "anon") {
      await client.query("set local role anon");
    } else {
      await client.query("set local role authenticated");
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: actor.id, role: "authenticated" }),
      ]);
    }
    return await fn(client);
  } finally {
    try {
      await client.query("rollback");
    } catch {
      // connection died mid-test; release below regardless.
    }
    client.release();
  }
}

/** Superuser transaction (privileged assertions), rolled back afterwards. */
export async function actAsSuperuser<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    try {
      await client.query("rollback");
    } catch {
      // ignore
    }
    client.release();
  }
}

/** Superuser statements that COMMIT — for durable fixtures in beforeAll. */
export async function superuser<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export interface FixtureIds {
  orgA: string;
  orgB: string;
  admin: string;
  managerA: string;
  moderatorA: string;
  clientA: string;
  clientB: string;
  pendingA: string;
}

/**
 * Standard two-tenant fixture set:
 *   - Org A: active client A (owner), pending member, manager+moderator assigned
 *   - Org B: active client B (owner), no staff assignments
 * `seed` must be a unique hex digit per test file so serially-run files never
 * collide on IDs or emails.
 */
export async function createFixtures(seed: string): Promise<FixtureIds> {
  const ids: FixtureIds = {
    orgA: `${seed}aaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`,
    orgB: `${seed}bbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`,
    admin: `${seed}0000001-0000-4000-8000-000000000001`,
    managerA: `${seed}0000002-0000-4000-8000-000000000002`,
    moderatorA: `${seed}0000003-0000-4000-8000-000000000003`,
    clientA: `${seed}0000011-0000-4000-8000-000000000011`,
    clientB: `${seed}0000012-0000-4000-8000-000000000012`,
    pendingA: `${seed}0000013-0000-4000-8000-000000000013`,
  };

  await superuser(async (db) => {
    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data)
       select v.id::uuid, $7 || v.email, v.meta::jsonb
         from (values
           ($1, 'admin@fixtures.test', '{"full_name":"Fixture Admin"}'),
           ($2, 'manager@fixtures.test', '{"full_name":"Fixture Manager"}'),
           ($3, 'moderator@fixtures.test', '{"full_name":"Fixture Moderator"}'),
           ($4, 'client.a@fixtures.test', '{"full_name":"Client Alpha"}'),
           ($5, 'client.b@fixtures.test', '{"full_name":"Client Beta"}'),
           ($6, 'pending@fixtures.test', '{"full_name":"Pending Person"}')
         ) as v(id, email, meta)
       on conflict (id) do nothing`,
      [
        ids.admin,
        ids.managerA,
        ids.moderatorA,
        ids.clientA,
        ids.clientB,
        ids.pendingA,
        `${seed}-`,
      ],
    );

    await db.query(
      `update public.profiles set role='administrator', status='active' where id=$1`,
      [ids.admin],
    );
    await db.query(
      `update public.profiles set role='manager', status='active' where id=$1`,
      [ids.managerA],
    );
    await db.query(
      `update public.profiles set role='moderator', status='active' where id=$1`,
      [ids.moderatorA],
    );
    await db.query(
      `update public.profiles set status='active' where id = any($1::uuid[])`,
      [[ids.clientA, ids.clientB]],
    );

    await db.query(
      `insert into public.organizations (id, name, slug) values
        ($1, 'Fixture Org A', $3 || '-org-a'),
        ($2, 'Fixture Org B', $3 || '-org-b')
       on conflict (id) do nothing`,
      [ids.orgA, ids.orgB, `fix${seed}`],
    );

    await db.query(
      `insert into public.organization_memberships (organization_id, user_id, is_owner) values
        ($1, $3, true),
        ($2, $4, true),
        ($1, $5, false)
       on conflict do nothing`,
      [ids.orgA, ids.orgB, ids.clientA, ids.clientB, ids.pendingA],
    );

    await db.query(
      `insert into public.staff_assignments (organization_id, user_id) values
        ($1, $2), ($1, $3)
       on conflict do nothing`,
      [ids.orgA, ids.managerA, ids.moderatorA],
    );
  });

  return ids;
}
