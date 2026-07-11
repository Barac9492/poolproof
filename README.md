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
   splits automatically: 74% builder · 15% maintenance annuity · 3% spec author
   · 8% platform. Any red → logged forever, nothing moves.

Founding specs in `specs/` are based on real, long-open OSS feature requests
(GitHub-style markdown alerts, ISO 8601 duration parsing, Korean-aware slugify).

## Stack

- Next.js 16 (App Router, Server Actions) + TypeScript + Tailwind 4
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

## Try the verification harness

Run any spec's public suite against a candidate module, exactly as the server
does:

```bash
node specs/_harness.mjs specs/markdown-alerts submissions/markdown-alerts/index.mjs   # 10/10 → green
node specs/_harness.mjs specs/markdown-alerts submissions/markdown-alerts/attempt-1.mjs # overfits → red on holdouts
```

See [CONTRIBUTING.md](CONTRIBUTING.md) and
[poolproof.dev/docs/building](https://poolproof.dev/docs/building).

## Status & limitations (public beta)

- Credits are prepaid units, not equity or tokens. Payments run through Polar
  in sandbox during the beta.
- The verification harness runs submissions in a hardened child process (clean
  env, Node `--permission` scoped to `specs/`/`submissions/`, no child
  processes). **Network isolation is the last sandbox layer, still in progress**
  — until it lands, only vetted submissions run. Self-serve git-connected
  submission is the next milestone.

MIT-licensed. Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
