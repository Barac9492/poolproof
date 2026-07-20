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
the submission module.

## Build against a spec

Run any spec's public suite against a candidate module before you stake:

```bash
node specs/_harness.mjs specs/<slug> path/to/your-module.mjs
```

The harness prints a JSON result per public test. Get that suite all-green
locally, then submit. The server separately loads and runs the private holdouts.
See [docs/building](https://poolproof.dev/docs/building).

## The verification harness

`specs/_harness.mjs` imports a submission module and runs every `public` and
`holdout` test against it, printing a JSON array. In production it runs in a
hardened child process (clean env, Node `--permission` with read-only access
scoped to `specs/` and `submissions/`, no child processes). Network isolation
(the last sandbox layer) is in progress — until it lands, only vetted
submissions run.

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
