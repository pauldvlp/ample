import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { runMigrations } from '../scripts/migrate-lib.mjs';

// Runs (via the webServer command) BEFORE `next start`, so the app boots against a
// migrated + seeded DB. Doing it here rather than in Playwright's globalSetup avoids
// the ordering deadlock: Playwright waits for the webServer's URL to be ready before
// running globalSetup, but the server can't be ready until the DB has tables.
const dbPath = process.env.DB_FILE_NAME!;
['', '-wal', '-shm'].forEach((s) => fs.rmSync(dbPath + s, { force: true }));
runMigrations({ dbPath, migrationsFolder: path.resolve('drizzle'), log: () => {} });
execFileSync('pnpm', ['exec', 'tsx', 'db/seed.ts'], { env: process.env, stdio: 'inherit' });
