import { defineConfig } from 'vitest/config';
import path from 'node:path';

// One throwaway SQLite DB for the whole run (never data/ample.db). Set before the
// @/db singleton is imported; the global-setup migrates it and cleans up after.
const root = process.cwd();
const DB_FILE_NAME = path.join(root, 'data', '.vitest.db');
process.env.DB_FILE_NAME = DB_FILE_NAME;

export default defineConfig({
  resolve: {
    // server-only/next/cache are no-ops out of a request scope;
    // @/* resolves from the repo root.
    alias: [
      { find: 'server-only', replacement: path.join(root, '__test/server-only-shim.ts') },
      { find: 'next/cache', replacement: path.join(root, '__test/next-cache-shim.ts') },
      { find: /^@\//, replacement: `${root}/` },
    ],
  },
  test: {
    environment: 'node',
    globalSetup: ['./__test/vitest.global-setup.ts'],
    env: { DB_FILE_NAME },
    // Integration tests share one SQLite file — run serially, no cross-file races.
    fileParallelism: false,
    include: ['lib/**/*.test.ts', '__test/**/*.test.ts'],
  },
});
