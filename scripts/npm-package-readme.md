# Ample

A complete, single-user personal finance app with the feel of a beautifully
printed wealth statement — accounts, transactions, budgets, goals, recurring
bills, debts, net worth and rich reports, all local-first in a single SQLite
file, with an optional bring-your-own-key AI assistant.

Full docs, screenshots, and source: <https://github.com/pauldvlp/ample>

## Run it

```bash
npx @pauldvlp/ample
```

That's it — it prints the URL to open once it's up (`http://127.0.0.1:4211`
by default). Data persists between runs in a per-OS app-data directory (e.g.
`~/.local/share/ample` on Linux), so running it again from any folder finds
the same database.

Prefer a permanent command? `npm install -g @pauldvlp/ample`, then just run
`ample`.

## Configuring

Everything about the app itself — currency, language, theme, the optional AI
assistant's provider/API key — is configured **in the app**, under Settings.
The only things configurable outside the app are where it listens and where
it stores data:

| Flag | Env var | Default | Purpose |
| --- | --- | --- | --- |
| `--port <n>` | `PORT` / `AMPLE_PORT` | `4211` | HTTP port |
| `--host <addr>` | `HOSTNAME` | `127.0.0.1` | Bind address — pass `--host 0.0.0.0` for LAN/phone access |
| `--data-dir <dir>` | `DB_FILE_NAME` (full file path, not a directory) | per-OS app-data dir | Where the SQLite database lives |

```bash
npx @pauldvlp/ample --port 8080 --host 0.0.0.0
```

## Something more permanent?

For a long-running self-hosted deployment, Docker is the better fit (a
`docker-compose.yml` is provided) — see
[DEPLOY.md](https://github.com/pauldvlp/ample/blob/main/DEPLOY.md). This npm
package is the same app, just packaged for a zero-friction `npx` start.

MIT licensed.
