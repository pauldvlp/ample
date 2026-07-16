# Security Policy

Ample is a self-hosted personal finance app: by design, your data (accounts,
transactions, balances, and — if you turn it on — an AI provider API key)
lives only in your own SQLite database, under your own control. We take
reports that could put that data at risk seriously.

## Supported Versions

Ample is pre-1.0 and released as a single rolling line — only the latest
published version on npm (`@pauldvlp/ample`) / the latest `main` receives
security fixes. There are no parallel maintained major versions yet.

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security reports.**

Instead, report privately:

- Preferred: use [GitHub's private vulnerability reporting](../../security/advisories/new)
  for this repository ("Security" tab → "Report a vulnerability").
- Or email **johanpaulbarahona@gmail.com** with a description of the issue,
  steps to reproduce, and its potential impact.

You should get an acknowledgement within a few days. We'll keep you updated as
the issue is investigated and fixed, and credit you in the release notes if
you'd like (or keep you anonymous — your call).

## Scope

Things we consider in scope: anything that could let an attacker read/modify
another user's data on a shared deployment, bypass intended access controls,
exfiltrate a stored AI provider API key, or achieve code execution against a
running instance (e.g. via crafted input to a Server Action, the CSV
import/export path, or the AI chat/tool-calling layer).

Out of scope: vulnerabilities that require an attacker to already have
filesystem or database access on the host (Ample is single-user and assumes
whoever can reach the SQLite file already has full access to the data it
contains — that's the same trust boundary as, say, a local `.git` folder), and
issues in upstream dependencies that should be reported to those projects
directly (though we're happy to hear about them too, so we can update).

## A note on the AI assistant

The AI assistant ("Amp") is opt-in and off by default. Its provider API key is
stored server-side in your own database and is only ever sent to the provider
you configured — never to the browser, never to us. Ample has no telemetry and
does not phone home.
