// Shared migration logic — used by both the Docker/dev CLI wrapper
// (scripts/migrate.mjs) and the npm CLI (bin/ample.mjs). Uses drizzle-orm's
// programmatic migrator (a production dependency) instead of drizzle-kit (a
// devDependency absent from both the standalone Docker image and the
// published npm package). It records applied migrations in
// `__drizzle_migrations` and applies ONLY pending ones, so it is idempotent
// and never destructive — existing data is left untouched.

import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";

export function runMigrations({ dbPath, migrationsFolder, log = console.log }) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const client = new Database(dbPath);
  client.pragma("journal_mode = WAL");
  client.pragma("foreign_keys = ON");

  const db = drizzle(client);
  log(`[migrate] applying migrations from ${migrationsFolder} → ${dbPath}`);
  migrate(db, { migrationsFolder });
  log("[migrate] done");
  client.close();
}
