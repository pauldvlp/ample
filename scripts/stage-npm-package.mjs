// Assembles dist-npm/ — the tree that actually gets `npm publish`ed as
// @pauldvlp/ample. Run after `next build` (via `pnpm stage:npm`, or
// `pnpm pack:npm` to also tar it up).
//
// The root package.json / node_modules are NOT what gets published (root
// stays "private": true — it carries the full dev tree: tests, devDeps,
// workspace scripts). This script stages a minimal, self-contained tree with
// its own trimmed package.json instead.
//
// node_modules is deliberately NOT copied wholesale from the standalone
// build's output, even though `output: "standalone"` (next.config.ts)
// normally bundles a curated one:
//  - better-sqlite3 (a native addon) in there was compiled for THIS build
//    machine's OS/arch; the published package can be installed on any
//    platform, so it needs a binary matching whatever machine it lands on.
//  - pnpm's node_modules is itself a tree of symlinks into a `.pnpm` store,
//    and Next's output tracing doesn't guarantee every transitive symlink
//    target in that store is actually included — dereferencing it while
//    staging throws ENOENT on the first dangling one found (confirmed
//    empirically: a `.pnpm/node_modules/semver` link with no target).
// So dist-npm/package.json instead lists the real runtime "dependencies"
// (mirroring the root's), and the end user's own `npm install` resolves
// every one of them fresh for their machine, found via Node's normal
// upward node_modules resolution from wherever the standalone server code
// sits — exactly like any npm package.
//
// ONE exception, discovered empirically (this is genuinely load-bearing —
// don't "simplify" it away without re-testing): Turbopack does not compile
// require("better-sqlite3") into the server chunks. It compiles
// require("better-sqlite3-<hash>") — a content-addressed alias — and stages
// a matching directory at .next/standalone/.next/node_modules/better-sqlite3-
// <hash>/ containing a full copy (package.json + lib/*.js + the compiled
// build/Release/*.node) for THAT exact require() call to resolve. A normal
// npm-installed "better-sqlite3" at the package root is invisible to it —
// wrong name entirely, so Node's ordinary upward resolution never reaches it.
// That hash directory's package.json + lib/*.js are pure JS (kept as-is,
// portable); only its build/Release/*.node is excluded here and patched back
// in by bin/ample.mjs at startup, copied from whatever npm actually installed
// for the machine ample is running on.

import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..");
const dist = path.join(root, "dist-npm");

function copy(from, to, { exclude } = {}) {
  fs.cpSync(from, to, {
    recursive: true,
    dereference: true,
    filter: exclude ? (src) => !exclude(src) : undefined,
  });
}

console.log("[stage] cleaning dist-npm/");
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

const standaloneSrc = path.join(root, ".next", "standalone");
if (!fs.existsSync(standaloneSrc)) {
  console.error(`[stage] ${standaloneSrc} is missing — run \`pnpm build\` first.`);
  process.exit(1);
}

console.log(
  "[stage] copying .next/standalone/ (native binaries + baked-in data/ excluded, see notes above)"
);
copy(standaloneSrc, path.join(dist, ".next", "standalone"), {
  exclude: (src) => {
    const parts = path.relative(standaloneSrc, src).split(path.sep);

    // `next build` prerenders pages that read Settings from SQLite, and
    // Next's file tracer sweeps up whatever DB file that touches — on a
    // machine with a real, in-use ./data/ample.db (any dev box, not just CI)
    // that means **actual user data** ends up here. Confirmed empirically:
    // it was this developer's real 366-transaction database. Excluded
    // unconditionally — dist-npm must never be able to carry a data/ folder.
    if (parts[0] === "data") return true;

    const nmIdx = parts.indexOf("node_modules");
    if (nmIdx === -1) return false;

    // The top-level standalone/node_modules snapshot (and the .pnpm store it
    // symlinks into) isn't reachable by the compiled server's require() calls
    // and/or isn't portable across machines — excluded entirely. Only the
    // .next/node_modules/ tree (Turbopack's hash-aliased natives, see the
    // file-level note) gets special handling below.
    if (parts[nmIdx - 1] !== ".next") return true;

    // cpSync's filter is also consulted for directories, and returning
    // "exclude" for one skips its whole subtree without recursing — so every
    // ancestor on the way down to the compiled binary must independently
    // resolve to "keep" here, not just the final build/ check.
    const pkgName = parts[nmIdx + 1];
    if (pkgName === undefined) return false; // .next/node_modules itself
    if (!pkgName.startsWith("better-sqlite3-")) return true; // unexpected/unneeded package
    return parts[nmIdx + 2] === "build"; // keep package.json + lib/**, drop the compiled binary
  },
});

console.log("[stage] copying .next/static/ -> .next/standalone/.next/static/");
copy(
  path.join(root, ".next", "static"),
  path.join(dist, ".next", "standalone", ".next", "static")
);

console.log("[stage] copying public/ -> .next/standalone/public/");
copy(path.join(root, "public"), path.join(dist, ".next", "standalone", "public"));

console.log("[stage] copying drizzle/, bin/, scripts/migrate-lib.mjs, LICENSE");
copy(path.join(root, "drizzle"), path.join(dist, "drizzle"));
copy(path.join(root, "bin"), path.join(dist, "bin"));
fs.mkdirSync(path.join(dist, "scripts"), { recursive: true });
fs.copyFileSync(
  path.join(root, "scripts", "migrate-lib.mjs"),
  path.join(dist, "scripts", "migrate-lib.mjs")
);
fs.copyFileSync(path.join(root, "LICENSE"), path.join(dist, "LICENSE"));
fs.copyFileSync(
  path.join(root, "scripts", "npm-package-readme.md"),
  path.join(dist, "README.md")
);

const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));

const distPkg = {
  name: "@pauldvlp/ample",
  version: rootPkg.version,
  description: rootPkg.description,
  keywords: rootPkg.keywords,
  homepage: rootPkg.homepage,
  bugs: rootPkg.bugs,
  repository: rootPkg.repository,
  author: rootPkg.author,
  license: rootPkg.license,
  // NOT rootPkg.engines verbatim: root's requires >=22.13 because pnpm@11
  // itself needs it — a dev-only constraint. End users installing the
  // published package use plain npm (no pnpm involved) to run the compiled
  // standalone server + better-sqlite3, which support Node 20 (matches the
  // Docker image's node:22-slim floor and better-sqlite3's own engines field).
  engines: { node: ">=20" },
  publishConfig: { access: "public" },
  bin: { ample: "./bin/ample.mjs" },
  // Mirrors the root's runtime "dependencies" verbatim (not just
  // better-sqlite3) — see the note atop this file on why node_modules isn't
  // copied from the build. `npm install` resolves every one of these fresh.
  dependencies: rootPkg.dependencies,
};

fs.writeFileSync(path.join(dist, "package.json"), JSON.stringify(distPkg, null, 2) + "\n");

// Final guard, independent of the exclude filter above: refuse to leave a
// database file staged under any name/location. This is what would actually
// get published if it slipped through, so it gets an unconditional check of
// its own rather than trusting a single filter to never regress.
function findDbFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return findDbFiles(full);
    return /\.db(-wal|-shm)?$/.test(entry.name) ? [full] : [];
  });
}
const strayDbFiles = findDbFiles(dist);
if (strayDbFiles.length > 0) {
  console.error(`[stage] refusing to publish — found database file(s) staged in dist-npm/:`);
  for (const f of strayDbFiles) console.error(`  ${f}`);
  process.exit(1);
}

console.log(`[stage] done -> ${dist} (v${distPkg.version})`);
