import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  schema: './db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DB_FILE_NAME ?? './data/ample.db',
  },
  strict: true,
  verbose: true,
});
