import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

const TEST_DB = "proguidance_test";

function adminUrl(): string {
  return (
    process.env.TEST_DATABASE_URL ??
    "postgres://postgres:postgres@127.0.0.1:5432/postgres"
  );
}

export function testDbUrl(): string {
  const url = new URL(adminUrl());
  url.pathname = `/${TEST_DB}`;
  return url.toString();
}

/**
 * Creates a throwaway database, applies the Supabase-compat shim and then the
 * real migration files from supabase/migrations in order. Runs once per
 * integration-test invocation.
 */
export default async function globalSetup(): Promise<void> {
  const admin = new Client({ connectionString: adminUrl() });
  try {
    await admin.connect();
  } catch (error) {
    throw new Error(
      `Integration tests need PostgreSQL. Could not connect using ` +
        `TEST_DATABASE_URL (${adminUrl()}): ${String(error)}`,
    );
  }
  await admin.query(`drop database if exists ${TEST_DB} with (force)`);
  await admin.query(`create database ${TEST_DB}`);
  await admin.end();

  const db = new Client({ connectionString: testDbUrl() });
  await db.connect();
  try {
    const root = path.resolve(import.meta.dirname, "..", "..");
    const shim = readFileSync(
      path.join(import.meta.dirname, "supabase-shim.sql"),
      "utf8",
    );
    await db.query(shim);

    const migrationsDir = path.join(root, "supabase", "migrations");
    const migrations = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    for (const file of migrations) {
      const sql = readFileSync(path.join(migrationsDir, file), "utf8");
      try {
        await db.query(sql);
      } catch (error) {
        throw new Error(`Migration ${file} failed: ${String(error)}`);
      }
    }
  } finally {
    await db.end();
  }
}
