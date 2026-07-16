# Deploying Ample

Ample is a single-user, self-hosted app backed by a local SQLite file. The
database lives on a **Docker volume**, so you can rebuild and redeploy the image
as often as you like without ever losing data.

## TL;DR (Docker Compose)

The quickest path is the `pnpm docker` script — it builds the image and starts
the container in the background:

```bash
pnpm docker                       # = docker compose up -d --build
pnpm docker:logs                  # watch startup + migrations
pnpm docker:down                  # stop + remove the container
# open http://localhost:4211
```

To run on a **custom host port**, set `AMPLE_PORT` (the container always listens on
4211 internally, so no rebuild is needed to change it):

```bash
AMPLE_PORT=8080 pnpm docker          # open http://localhost:8080
```

Or set `AMPLE_PORT` in a `.env` file next to `docker-compose.yml` to make it stick.

The equivalent raw Compose commands:

```bash
docker compose up -d --build      # build + start
docker compose logs -f Ample        # watch startup + migrations
```

To update to a new version of the code:

```bash
git pull
docker compose up -d --build      # rebuilds image; data on the volume is kept
```

Your data lives in the named volume `ample-data` (mounted at `/data`). It is
**not** part of the image, so `--build` never touches it.

## Plain Docker

```bash
docker build -t Ample .
docker volume create ample-data
docker run -d --name Ample -p 4211:4211 -v ample-data:/data Ample
```

## How data safety works

- The SQLite file (`/data/ample.db` + its `-wal`/`-shm` sidecars) is stored on the
  mounted volume, decided by the `DB_FILE_NAME` env var (default `/data/ample.db`).
- On every container start, `docker-entrypoint.sh` runs
  `node scripts/migrate.mjs`, which uses Drizzle's programmatic migrator. It
  records applied migrations in `__drizzle_migrations` and applies **only
  pending** ones — it is idempotent and additive, so restarts and upgrades never
  destroy existing rows.
- The image is a Next.js **standalone** build (`output: "standalone"`), so the
  runtime is small and self-contained.

## Backups

Because it's just a SQLite file, backups are trivial:

```bash
# copy the DB out of the volume
docker run --rm -v ample-data:/data -v "$PWD":/backup busybox \
  sh -c "cp /data/ample.db /backup/Ample-backup.db"
```

The app also has **Settings → Data** for in-app CSV export.

## AI features (optional)

Amp, the in-app AI assistant, is **off by default** and configured entirely in
the app (**Settings → AI assistant**): pick a provider (Anthropic, OpenAI or Google),
paste an API key, and save. The key is stored in your own database and is only
ever sent to the provider you chose — it never appears in the browser and does
not need to be set as an environment variable. With AI off, everything
(including natural-language quick-add via the offline parser) still works.

## Environment variables

| Variable         | Default          | Purpose                                  |
| ---------------- | ---------------- | ---------------------------------------- |
| `DB_FILE_NAME`   | `/data/ample.db`   | SQLite database path (keep on the volume) |
| `AMPLE_PORT`       | `4211`           | **Host** port the Compose service publishes (maps to the container's 4211). Read by `docker-compose.yml`. |
| `PORT`           | `4211`           | HTTP port the server binds **inside** the container |
| `HOSTNAME`       | `0.0.0.0`        | Bind address                             |

## Notes

- Base image is `node:22-slim` (Debian). Deps are installed with **pnpm via
  corepack** (`corepack enable` then `pnpm install --frozen-lockfile`) — pnpm is
  pinned by the `packageManager` field in `package.json`. `better-sqlite3` is a
  native module and is compiled during that install (build tools — `python3 make
  g++` — are present in the deps stage, and the build is allowed via `allowBuilds`
  in `pnpm-workspace.yaml`). Build and runtime share the same base + arch so the
  binary is compatible. The image builds with `CI=true` so pnpm stays
  non-interactive and never blocks waiting to approve a build script.
- `pnpm-workspace.yaml` is copied into the image alongside `package.json` and
  `pnpm-lock.yaml`. It carries the `allowBuilds` approvals and
  `enablePrePostScripts`, so it **must** be present or the native build is skipped
  and the app dies at runtime.
- Do **not** add `better-sqlite3` to `serverExternalPackages` — Next.js already
  auto-externalizes it, and adding it breaks the Turbopack instrumentation hook.
