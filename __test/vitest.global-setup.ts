import fs from 'node:fs';
import path from 'node:path';
import { runMigrations } from '../scripts/migrate-lib.mjs';

// Migrate a fresh throwaway DB before the suite; wipe it after.
export default function setup() {
  const dbPath = process.env.DB_FILE_NAME!;
  const wipe = () => ['', '-wal', '-shm'].forEach((s) => fs.rmSync(dbPath + s, { force: true }));
  wipe();
  runMigrations({ dbPath, migrationsFolder: path.resolve('drizzle'), log: () => {} });
  return wipe;
}
