# Contributing to Poolproof

Poolproof funds software by paying only when a real CI run over a real test
suite goes green. There are three ways to contribute: author a spec, build
against one, or improve the platform.

## Run the platform locally

```bash
npm install
npm run dev        # http://localhost:3000
```

`poolproof.db` (a local libSQL file) is created and seeded on first run. Delete
it to reset. Payments and OAuth are dormant unless their env vars are set, so
the app runs fully without any secrets.

## Author a spec

A spec is a contract card plus 3+ testable acceptance criteria. See
[docs/writing-specs](https://poolproof.dev/docs/writing-specs). Founding specs
live in `specs/<slug>/` as `public.test.mjs`. Private holdouts are never
committed to this repository: production loads rotated, base64-encoded suites
from sensitive environment variables, while local authors may use an ignored
`holdout.test.mjs`. Each test is `{ name, run(mod) }` and asserts behavior on
the submission module. A private suite that imports Wordle support files must
use the `__WORDS_URL__` and `__PLAY_URL__` placeholder specifiers; the harness
replaces them with permitted file URLs before loading the deployment-secret
payload. Both `.gitignore` and `.vercelignore` exclude local holdout files;
never force-add one or bypass those upload rules.

## Build against a spec

Run any spec's public suite against a candidate module before you stake:

```bash
PP_RESULT_SECRET=0123456789abcdef0123456789abcdef \
  node --experimental-vm-modules specs/_harness.mjs \
  specs/<slug> path/to/your-module.mjs
```

The harness emits one signed result envelope. With no ignored local holdout file,
it contains the public tests only; production separately requires and runs the
private payload before accepting any result.
See [docs/building](https://poolproof.dev/docs/building).

## The verification harness

`specs/_harness.mjs` loads candidate source into a separate VM realm with no
imports, process, host objects, filesystem, or network global. The outer child
also has a clean environment, Node permissions, memory/time limits, and a
per-run authenticated manifest. Missing tests, candidate output, and early exits
fail closed. An external OS sandbox remains planned as defense in depth.

## Code layout

- `src/lib/db.ts` — libSQL data layer (projects, escrow, credits, users, social)
- `src/lib/runner.ts` — verification runner + harness invocation
- `src/lib/polar.ts` — Polar (Merchant of Record) payments
- `src/lib/oauth.ts` + `src/app/api/auth/` — GitHub/Google OAuth
- `src/app/p/[slug]` — project page (contract card, tests, runs, ledger)

## Reporting issues & ideas

Open a [Discussion](https://github.com/Barac9492/poolproof/discussions) for
ideas and questions, or a [bug report](https://github.com/Barac9492/poolproof/issues/new/choose)
for something broken. Include steps to reproduce and what you expected.
