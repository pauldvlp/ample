#!/usr/bin/env sh
# Integration smoke test for the AI agent tool layer. Spins up a throwaway
# SQLite DB (never touches data/ample.db), migrates it, and runs the executors
# against it. See __test/agent-smoke.mts. No API key / network needed.
DB="./data/.agent-smoke.db"
export DB_FILE_NAME="$DB"
rm -f "$DB" "$DB-wal" "$DB-shm"
pnpm db:migrate || exit 1
tsx --tsconfig tsconfig.test.json __test/agent-smoke.mts
code=$?
rm -f "$DB" "$DB-wal" "$DB-shm"
exit $code
