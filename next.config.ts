import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // NOTE: better-sqlite3 (a native addon) is already in Next.js's built-in
  // serverExternalPackages list. Adding it explicitly makes Turbopack emit a
  // content-hashed external that the instrumentation hook can't resolve, so we
  // rely on the default here.
  //
  // Pin the workspace root to this project (a parent pnpm-lock.yaml otherwise
  // confuses Turbopack's root inference and can mis-resolve modules).
  turbopack: {
    root: import.meta.dirname,
  },
  // Self-contained production build (`.next/standalone/server.js`) for Docker.
  // Only affects `next build`, not `next dev`.
  output: 'standalone',
  // Make sure the native better-sqlite3 binding is traced into the standalone
  // output (it's required dynamically, so belt-and-suspenders).
  // drizzle-orm is bundled into the server chunks by Turbopack, so Next never
  // traces it into the standalone node_modules. But scripts/migrate.mjs runs at
  // container start OUTSIDE the build graph and imports
  // `drizzle-orm/better-sqlite3/migrator`, which Node resolves from disk — so
  // force the whole package in (it's dependency-free → self-contained).
  //
  // better-sqlite3 (a native addon, marked external) is deliberately NOT forced
  // here: it's `require`d dynamically, so the tracer can't follow it, and its
  // pnpm-symlinked deps don't flatten into a resolvable layout. The Dockerfile
  // stages its full runtime closure instead — see the "runner" stage.
  outputFileTracingIncludes: {
    '/**/*': ['./node_modules/drizzle-orm/**/*'],
  },
  // Hide the dev-only overlay indicator (it floats over the sidebar footer).
  devIndicators: false,
};

export default nextConfig;
