# Publishing @pauldvlp/ample (maintainer notes)

Ongoing releases are automated (release-please + npm OIDC Trusted Publishing —
see [CONTRIBUTING.md](./CONTRIBUTING.md#how-releases-work)). This doc is the
**one-time bootstrap** a maintainer has to do by hand, plus what "cutting a
release" looks like day to day. None of this can be done by an AI assistant on
your behalf — it needs your own npm/GitHub identity.

## Why a manual bootstrap at all?

npm's Trusted Publishing (OIDC) can only be attached to a package that **already
exists** on the registry — there's no way to pre-register a trusted publisher
for a name that's never been published (unlike PyPI). So the very first
version has to go up the old-fashioned way, once, and only then can the
tokenless CI workflow take over for every release after that.

## One-time setup

1. ~~Create the GitHub repo and push~~ — done: <https://github.com/pauldvlp/ample>.

2. **Log in to npm locally** (needs an npm account that can publish under the
   `@pauldvlp` scope):

   ```bash
   npm login
   ```

3. **Bootstrap-publish the first version manually**, from the staged package
   directory (not the repo root — the root's `package.json` stays
   `"private": true` on purpose):

   ```bash
   pnpm install
   pnpm build
   pnpm stage:npm
   cd dist-npm
   npm publish --access public
   cd ..
   ```

4. **Attach Trusted Publishing** to the now-existing package, scoped to this
   repo's release workflow (needs npm CLI ≥ 11.5.1 — `npm -v` to check,
   `npm install -g npm@latest` if not):

   ```bash
   npm trust github @pauldvlp/ample \
     --file release-please.yml \
     --repo pauldvlp/ample \
     --allow-publish
   ```

   (Equivalent manual path: npmjs.com → the package → *Settings* → *Trusted
   Publisher* → GitHub Actions → same repo/workflow filename.)

That's it — steps 2–4 never need to be repeated. Every release from here on is
tokenless: no `NPM_TOKEN` secret ever needs to exist in the GitHub repo.

## Cutting a release from then on

1. Merge PRs to `main` as normal (Conventional Commit messages —
   `CONTRIBUTING.md` has the cheat sheet).
2. release-please's bot keeps a "chore(main): release X.Y.Z" PR up to date
   with the version bump + generated `CHANGELOG.md` entries.
3. Merge that PR whenever you want to actually ship a release. That merge:
   - tags the release and creates a GitHub Release,
   - triggers the `publish` job in `.github/workflows/release-please.yml`,
     which builds, stages `dist-npm/`, and runs `npm publish --provenance`
     via OIDC — no secrets involved.

Nothing to do by hand: no `npm version`, no `git tag`, no manual `npm publish`.

## Sanity checks

- `npm view @pauldvlp/ample` — confirms what's actually live.
- `npx @pauldvlp/ample@latest --version` — smoke-tests a fresh install end to end.
