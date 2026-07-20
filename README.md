# Poolproof — money moves only on green

Pay-on-green outcome market for community-funded software. Backers escrow
credits behind an **executable spec**; the escrow releases only when every
acceptance test passes a **real CI run**. Builders — not backers — carry the
execution risk.

**Live:** [poolproof.dev](https://poolproof.dev) ·
**Docs:** [poolproof.dev/docs](https://poolproof.dev/docs) ·
**Discussions:** [GitHub](https://github.com/Barac9492/poolproof/discussions)

## The mechanism

1. **Executable spec** — a project is a public acceptance-test suite plus a
   plain-language contract card ("you get / you don't get"). Spec authors earn
   3% of the payout.
2. **Escrow** — pledges pool into escrow. No green by the deadline → full refund.
3. **Staked builder slots** — a builder stakes 5% of the pool for a time-boxed
   exclusive slot (a queue, not a race). Their compute, their risk.
4. **Pay-on-green** — the verification runner ([src/lib/runner.ts](src/lib/runner.ts)
   + [specs/_harness.mjs](specs/_harness.mjs)) executes the public suite **plus
   hidden holdout tests** in an isolated child process. All green → escrow
   splits automatically: 74% builder · 15% maintenance reserve · 3% spec author
   · 8% platform. Any red → logged forever, nothing moves.

Founding specs in `specs/` are based on real, long-open OSS feature requests
(GitHub-style markdown alerts, ISO 8601 duration parsing, Korean-aware slugify).

## Stack

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4
- Node.js >=22.13 (required by the verifier permission model)
- [libSQL / Turso](https://turso.tech) persistence (local file in dev)
- [Polar](https://polar.sh) (Merchant of Record) for credit payments
- GitHub + Google OAuth (state CSRF, Google PKCE, verified-email only)

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

`poolproof.db` (libSQL) is created and seeded on first run — delete it to reset.
Payments and OAuth are dormant unless their env vars are set, so the app runs
fully without any secrets.

## Deploy with durable storage (Turso)

The same SQLite dialect runs locally and in production — production just points
at a hosted [Turso](https://turso.tech) database instead of a file. A Vercel
runtime without `TURSO_DATABASE_URL` now fails closed; it never accepts state
into an ephemeral `/tmp` database.

```bash
# one-time, with the Turso CLI
turso db create poolproof
turso db show poolproof --url          # → TURSO_DATABASE_URL  (libsql://…)
turso db tokens create poolproof       # → TURSO_AUTH_TOKEN
```

Set both in the Vercel project (Production **and** Preview environments). Also
set a random sensitive `CRON_SECRET`; Vercel sends it as the bearer credential
to `/api/cron/tick`, which performs deadline refunds and slot expiry. Configure
all five `HOLDOUT_*_B64` variables listed in `src/lib/holdouts.ts`, then redeploy.
Migrations and founding demo seeds are failure-atomic and race-safe. Verify:

```bash
curl https://poolproof.dev/api/health
# {"ok":true,"db":"turso","durable":true,"holdoutsConfigured":true,"cronConfigured":true,…}

# vercel.json runs housekeeping daily at 03:00 UTC; verify the bearer gate:
curl -H "Authorization: Bearer $CRON_SECRET" https://poolproof.dev/api/cron/tick
```

A healthy deployment reports `db: "turso"`, `durable: true`, and
`holdoutsConfigured: true`. Local development reports `db: "local"`.

## Try the verification harness

Run a spec's public suite against a candidate module:

```bash
PP_RESULT_SECRET=0123456789abcdef0123456789abcdef \
  node --experimental-vm-modules specs/_harness.mjs \
  specs/markdown-alerts submissions/markdown-alerts/index.mjs
```

Production loads rotated private holdouts from sensitive environment variables;
they are never committed to this public repository. The trusted harness signs
an exact test manifest for each run, and the parent rejects candidate-controlled
stdout, missing tests, or early exits. Local spec authors can use an ignored
`specs/<slug>/holdout.test.mjs` while developing a suite.

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[poolproof.dev/docs/building](https://poolproof.dev/docs/building).

## Status & limitations (public beta)

- Founding pools are clearly marked read-only demos with synthetic credits and
  cannot move a user's balance.
- Credits are prepaid units, not equity or tokens. Polar is hard-limited to its
  sandbox during the beta; production payment credentials remain disabled.
- The verification harness runs submissions in a separate VM realm inside a
  permission-restricted child process: no imports, host objects, environment,
  filesystem, network global, workers, or child processes. A separate OS sandbox
  remains planned as defense in depth; until then, only vetted submissions run.

MIT-licensed. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
