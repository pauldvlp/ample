// Standalone migration runner for production/Docker start-up. See
// scripts/migrate-lib.mjs for the actual migration logic (shared with the
// npm CLI at bin/ample.mjs).

import path from "node:path";
import { runMigrations } from "./migrate-lib.mjs";

const dbPath =
  process.env.DB_FILE_NAME ?? path.join(process.cwd(), "data", "ample.db");
const migrationsFolder =
  process.env.MIGRATIONS_DIR ?? path.join(process.cwd(), "drizzle");

runMigrations({ dbPath, migrationsFolder });
