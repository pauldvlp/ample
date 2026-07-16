#!/usr/bin/env node
// CLI entry point for `npx @pauldvlp/ample` / `ample` (after a global install).
//
// Runs pending migrations against a local SQLite file, then starts the Next.js
// standalone server (see next.config.ts's `output: "standalone"`). Mirrors
// what docker-entrypoint.sh does for the Docker image, but resolves a
// sensible per-OS data directory instead of a mounted /data volume, since this
// can be run from any working directory on any machine.
//
// Layout this depends on (see scripts/stage-npm-package.mjs, which assembles
// it — the same relative layout also exists at the repo root after `next
// build`, which is how this gets exercised locally without publishing):
//   bin/ample.mjs (this file)
//   .next/standalone/server.js
//   .next/standalone/.next/static/   (copied in manually, Next doesn't by default)
//   .next/standalone/public/         (copied in manually, Next doesn't by default)
//   .next/standalone/.next/node_modules/better-sqlite3-<hash>/  (see patchNativeAliases below)
//   drizzle/                          (migrations)
//   node_modules/better-sqlite3/     (a real dependency — npm install compiles/fetches
//                                      the right binary for whatever machine this is)

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { parseArgs } from "node:util";
import { runMigrations } from "../scripts/migrate-lib.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const { values } = parseArgs({
  options: {
    port: { type: "string", short: "p" },
    host: { type: "string" },
    "data-dir": { type: "string" },
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
});

if (values.help) {
  console.log(`Ample — self-hosted personal finance

Usage: ample [options]

Options:
  -p, --port <port>      Port to listen on (default: 4211, env: PORT/AMPLE_PORT)
      --host <host>       Address to bind (default: 127.0.0.1, env: HOSTNAME)
      --data-dir <dir>    Where to store the SQLite database (env: DB_FILE_NAME
                           overrides with a full file path instead of a directory)
  -v, --version            Print the version and exit
  -h, --help                Show this help

All other configuration (currency, language, theme, the optional AI
assistant's provider/API key, ...) happens in-app under Settings — nothing
else needs an environment variable.`);
  process.exit(0);
}

if (values.version) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  console.log(pkg.version);
  process.exit(0);
}

function defaultDataDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "ample");
  }
  if (process.platform === "win32") {
    const base = process.env.APPDATA ?? path.join(os.homedir(), "AppData", "Roaming");
    return path.join(base, "ample");
  }
  const base = process.env.XDG_DATA_HOME ?? path.join(os.homedir(), ".local", "share");
  return path.join(base, "ample");
}

const port = values.port ?? process.env.PORT ?? process.env.AMPLE_PORT ?? "4211";
// Binds to localhost only by default — this is a finance app, and unlike the
// Docker image (where 0.0.0.0 is required just to escape the container's
// network namespace), a CLI run directly on someone's machine has no such
// boundary. Pass --host 0.0.0.0 explicitly to allow LAN/phone access.
const host = values.host ?? process.env.HOSTNAME ?? "127.0.0.1";

const dbPath =
  process.env.DB_FILE_NAME ?? path.join(values["data-dir"] ?? defaultDataDir(), "ample.db");
const migrationsFolder = path.join(root, "drizzle");
const serverPath = path.join(root, ".next", "standalone", "server.js");

if (!fs.existsSync(serverPath)) {
  console.error(
    `[ample] no build found at ${serverPath}.\n` +
      `[ample] if you're running this from a source checkout, run \`pnpm build\` first.`
  );
  process.exit(1);
}

// Turbopack compiles the server's `require("better-sqlite3")` calls into
// `require("better-sqlite3-<content-hash>")` and expects a matching
// .next/node_modules/better-sqlite3-<hash>/ directory to resolve it — a
// plain, normally-installed "better-sqlite3" is invisible to that exact
// require() call (wrong name). scripts/stage-npm-package.mjs ships that
// directory's JS as-is but deliberately omits its compiled build/Release/
// binary (built for the CI machine, not necessarily this one) — patch the
// one npm just installed for THIS machine into place, every start (cheap,
// idempotent, and self-healing across better-sqlite3 version bumps).
function patchNativeAliases() {
  // Resolved via real Node module resolution, NOT a hardcoded
  // root/node_modules/better-sqlite3 join — npm hoists dependencies, so the
  // package actually installed for this run can land several directories
  // above `root` (e.g. at the top of an npx cache tree), same as the plain
  // `import Database from "better-sqlite3"` in scripts/migrate-lib.mjs
  // already relies on.
  let realBinary;
  try {
    const pkgJsonPath = createRequire(import.meta.url).resolve("better-sqlite3/package.json");
    realBinary = path.join(path.dirname(pkgJsonPath), "build", "Release");
  } catch {
    return; // better-sqlite3 not resolvable — let the server's own require() report it
  }
  const aliasRoot = path.join(root, ".next", "standalone", ".next", "node_modules");
  if (!fs.existsSync(realBinary) || !fs.existsSync(aliasRoot)) return;

  for (const name of fs.readdirSync(aliasRoot)) {
    if (!name.startsWith("better-sqlite3-")) continue;
    const target = path.join(aliasRoot, name, "build", "Release");
    fs.mkdirSync(target, { recursive: true });
    for (const file of fs.readdirSync(realBinary)) {
      fs.copyFileSync(path.join(realBinary, file), path.join(target, file));
    }
  }
}
patchNativeAliases();

runMigrations({ dbPath, migrationsFolder, log: (msg) => console.log(`[ample] ${msg}`) });

console.log(`[ample] starting…
  URL:      http://${host}:${port}
  Database: ${dbPath}
  Change with --port/--host/--data-dir, or PORT/HOSTNAME/DB_FILE_NAME.
  AI assistant, currency, language, theme: all in-app under Settings.
`);

const child = spawn(process.execPath, [serverPath], {
  cwd: path.dirname(serverPath),
  stdio: "inherit",
  env: { ...process.env, PORT: String(port), HOSTNAME: host, DB_FILE_NAME: dbPath },
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
