#!/bin/sh
set -e

# Apply any pending migrations against the persisted volume, then hand off to
# the Next.js standalone server. Migrations are additive and idempotent, so a
# rebuild/redeploy never loses data.
echo "[entrypoint] running database migrations…"
node scripts/migrate.mjs

echo "[entrypoint] starting server…"
exec "$@"
