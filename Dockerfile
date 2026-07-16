# syntax=docker/dockerfile:1
#
# Multi-stage build for Ample (Next.js 16 standalone + better-sqlite3).
# The SQLite database lives on a mounted volume (/data), so rebuilding and
# redeploying the image never touches your data. Migrations run on start and
# are idempotent (only pending ones apply).

ARG NODE_VERSION=22-slim

# 1) deps — install all deps with pnpm (via corepack, pinned by the
#    "packageManager" field in package.json). Build tools cover the case where
#    better-sqlite3 (and other native addons) have no prebuilt binary for this
#    platform/Node ABI. CI=true keeps pnpm non-interactive so it never hangs
#    waiting to approve build scripts.
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
ENV CI=true
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
# pnpm-workspace.yaml carries `allowBuilds` (so better-sqlite3 & co. actually
# build under pnpm 11's strictDepBuilds) and `enablePrePostScripts`. It MUST be
# copied or the native build is skipped/errored and the app dies at runtime.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 2) builder — produce the standalone output. We invoke Next directly through
#    its bin to skip the `prebuild` script hook, which runs drizzle-kit migrate
#    (a devDependency, and against the wrong path).
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# The root layout reads settings from SQLite, so Next's build-time prerender of
# the static 404 shell (/_not-found) needs the tables to exist. Migrate a
# THROWAWAY build DB (default path /app/data/ample.db) first — it stays in this
# stage and is never copied into the runner, which uses the /data volume and
# re-runs migrations at start. No app data is baked into the image.
RUN node scripts/migrate.mjs \
  && ./node_modules/.bin/next build
# better-sqlite3 is a native addon: Next marks it external and `require`s it
# dynamically, so it is NOT traced into the standalone output. Stage its full
# RUNTIME closure — the package (minus the C sources it only needs to COMPILE)
# plus its runtime deps bindings → file-uri-to-path — dereferenced from pnpm's
# symlinked store into a flat node_modules the runner drops on top of the
# standalone bundle. ~2MB, vs the old ~844MB whole-tree tar.
RUN set -eux \
  && mkdir -p /tmp/nm/better-sqlite3/build/Release \
  && cp -L  node_modules/better-sqlite3/package.json         /tmp/nm/better-sqlite3/ \
  && cp -RL node_modules/better-sqlite3/lib                  /tmp/nm/better-sqlite3/lib \
  && cp -L  node_modules/better-sqlite3/build/Release/*.node /tmp/nm/better-sqlite3/build/Release/ \
  && cp -RL node_modules/.pnpm/bindings@*/node_modules/bindings                 /tmp/nm/bindings \
  && cp -RL node_modules/.pnpm/file-uri-to-path@*/node_modules/file-uri-to-path /tmp/nm/file-uri-to-path

# 3) runner — minimal runtime image
FROM node:${NODE_VERSION} AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=4211
ENV HOSTNAME=0.0.0.0
# SQLite database path (on the mounted volume)
ENV DB_FILE_NAME=/data/ample.db

# Standalone server + assets (static/public are NOT auto-included).
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Runtime migration bits: the committed SQL and the runner script.
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/scripts ./scripts
# node_modules rides inside the standalone bundle above (the .next/standalone
# COPY) — Next's tracing copied exactly the deps the server needs. Two things it
# can't trace are added explicitly:
#   • drizzle-orm — bundled into the server chunks, so absent from the traced
#     node_modules; scripts/migrate.mjs (outside Next's build graph) imports it
#     at start. Forced in via next.config.ts outputFileTracingIncludes.
#   • better-sqlite3 — a native addon Next marks EXTERNAL and requires
#     dynamically, so its JS is missing (the bundle leaves only a dangling pnpm
#     symlink for it). Replace it with the flat runtime closure staged in the
#     builder; this serves both server.js and scripts/migrate.mjs.
# No ~844MB full tree, no tar round-trip.
COPY --from=builder /tmp/nm /tmp/nm
RUN rm -rf ./node_modules/better-sqlite3 ./node_modules/bindings ./node_modules/file-uri-to-path \
  && cp -R /tmp/nm/. ./node_modules/ \
  && rm -rf /tmp/nm

COPY docker-entrypoint.sh ./docker-entrypoint.sh
# Only /data must be writable by the runtime user — SQLite lives on the mounted
# volume; /app is read-only at runtime (server + migrator only READ it as node).
# Do NOT `chown -R … /app`: with the full ~844MB / 74k-file node_modules tree
# untarred above, a recursive chown copies every file up into a fresh overlay
# layer (~112s here) AND roughly doubles the exported image (that duplicated
# layer inflates "exporting layers"/"unpacking"). Chowning just the empty /data
# mountpoint is instant and is all the volume needs.
RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /data \
  && chown node:node /data

USER node
EXPOSE 4211
VOLUME ["/data"]

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
