import "server-only";

import path from "node:path";
import fs from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

/**
 * Single-user, local-first SQLite connection.
 *
 * better-sqlite3 is a native module and must stay server-only (guaranteed by
 * the `server-only` import above). We cache the connection on globalThis so
 * Next.js dev hot-reload doesn't open a second handle (which would intermittently
 * throw "database is locked").
 */

export const DB_PATH =
  process.env.DB_FILE_NAME ?? path.join(process.cwd(), "data", "ample.db");

function createConnection() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const client = new Database(DB_PATH);
  // Pragmas are per-connection (except WAL which persists in the file header);
  // set them every open to be explicit.
  client.pragma("journal_mode = WAL");
  client.pragma("foreign_keys = ON");
  client.pragma("busy_timeout = 5000");
  return drizzle({ client, schema });
}

type DrizzleDb = ReturnType<typeof createConnection>;

const globalForDb = globalThis as unknown as { __ampleDb?: DrizzleDb };

export const db: DrizzleDb = globalForDb.__ampleDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__ampleDb = db;
}

export { schema };
