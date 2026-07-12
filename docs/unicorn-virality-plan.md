# Poolproof → Unicorn: The Global Virality Plan

**Status:** working strategy draft · **Owner:** founder · **Horizon:** 24 months
**Thesis in one line:** In the AI-agent era, writing code is free — *verifying and paying
for outcomes* is the scarce layer. Poolproof owns that layer, and it gets there by
turning every verification into a public spectacle.

---

## 1. Why this can be a unicorn (the honest version)

A unicorn needs a market that is exploding, a mechanism competitors can't cheaply
copy, and a distribution loop that compounds without paid acquisition.

**The market is flipping in our favor.** Code generation is collapsing to zero cost.
What does *not* collapse: knowing whether the code actually works, and moving money
only when it does. Every AI-agent marketplace, every "hire an agent" product, every
OSS bounty board needs an impartial pay-on-green settlement layer. Today that layer
doesn't exist — Upwork settles on vibes, GitHub bounties settle on maintainer mood,
Kickstarter settles on promises. Poolproof settles on **a CI run with hidden holdouts**.

**The moat is the oracle, not the marketplace.** Marketplaces are copyable; a trusted
verification oracle with a public, immutable green/red history is not. Every run logged
("any red → logged forever, nothing moves") compounds into the dataset and reputation
graph competitors can't fork. This is the Polymarket lesson: the resolution mechanism
*is* the product.

**The distribution loop is built into the mechanism.** A green isn't a transaction —
it's a *moment*: money visibly moving because tests visibly passed. Moments are
shareable; invoices are not. Section 3 is about weaponizing this.

**Unicorn math (so we know what we're steering toward):**

| Path | GMV needed | Take (8%) | Revenue | Plausible multiple |
|---|---|---|---|---|
| Escrow market alone | $1.0–1.5B | 8% | $80–120M | 8–12× → $1B |
| + Arena (tickets/prizes/sponsors) | $400M | ~15% blended | $60M | 15× (consumer+media) → $1B |
| + Agent settlement API (B2B infra) | any | per-verification fee | $50M ARR | 20× (infra) → $1B |

We don't need any single path to work perfectly; we need the arena to make the brand
global, the escrow market to make it durable, and the API to make it infrastructure.

---

## 2. The strategic sequence: Spectacle → Market → Infrastructure

The `wordle-solver` concierge test (AI 콜로세움 arena frame, ticket/prize instead of
escrow) is the right instinct. Formalize it as the front of a three-layer funnel:

1. **The Arena (spectacle, audience acquisition).** Public, time-boxed showdowns:
   humans and AI agents race to make a brutal holdout suite go green, live. Viewers
   buy tickets / back sides. This is *content* — it works on YouTube, Twitch, TikTok,
   X. It requires zero trust to enjoy and zero expertise to understand: **the bar
   goes green or it doesn't.**
2. **The Market (escrow, the actual business).** Arena viewers become backers of real
   specs — the long-open OSS feature requests, the "I'd pay $50 for this" tools.
   Same runner, same green bar, real stakes.
3. **The Rails (settlement API, the unicorn lock-in).** Any platform that pays for
   code outcomes — agent marketplaces, bounty boards, internal eng orgs — calls
   Poolproof to escrow + verify + split. The 74/15/3/8 split becomes a standard,
   like Stripe's 2.9% + 30¢.

Every phase feeds the next: spectacle brings eyeballs → eyeballs fund specs →
funded specs prove the oracle → the proven oracle sells as rails.

---

## 3. The viral engine: make every green a broadcast event

Virality isn't a marketing phase; it's a product property. Ship these loops in order
of leverage:

### Loop 1 — The Green Moment (single-player share)
The instant a suite goes green and escrow splits, generate a **shareable receipt**:
an OG-image/video card showing the red→green flip, the payout split animating
(74% builder · 15% annuity · 3% spec author · 8% platform), builder handle, elapsed
time, holdout count. One tap to post. Every payout becomes an ad with a dollar
amount on it — the same psychology as Polymarket resolution screenshots and
Wordle grids: **compressed, legible proof of a high-stakes outcome.**
- Build: `opengraph-image.tsx` already exists — extend to per-run result cards;
  add a replayable "run reel" (test names cascading green) as a 10s MP4/GIF.

### Loop 2 — The Red Wall (schadenfreude + credibility)
Failures are logged forever — surface them. A public wall of reds ("$4,200 pool,
9/10 public green, died on holdout #3") is morbidly shareable *and* it advertises
the one thing that matters: **this oracle cannot be sweet-talked.** Overfitting to
public tests and dying on holdouts (the repo already has `attempt-1.mjs` demoing
exactly this) is a story developers retell to each other unprompted.

### Loop 3 — Spec authorship as a creator economy (supply-side loop)
Spec authors earn 3% of payouts *forever*. That's a royalty. Market it as one:
"Write the test suite for the thing everyone wants; get paid every time anyone
funds it." Leaderboard of top-earning spec authors, author pages, "spec drop"
announcements. Writers of good specs recruit their own backers — that's the loop.
- Target: dev influencers get a co-authored launch spec. Their audience backs it.

### Loop 4 — Fund-this-issue (borrowed distribution)
A GitHub App + one-click flow: point at any long-open OSS issue → generate a draft
executable spec → open a Poolproof pool → the badge (`💰 $X escrowed · pay-on-green`)
appears in the issue thread. Every frustrated 👍-on-an-issue is a pre-qualified
backer. The founding specs (markdown alerts, ISO durations, Korean slugify) already
prove the sourcing model — now automate it and let *communities* run it.
- This is the highest-leverage growth surface: OSS issue threads are pre-aggregated
  demand with built-in audiences, and the badge travels on GitHub's domain.

### Loop 5 — The Agent Arena (the global-headline loop)
The rocket fuel. Frame matches as **AI model vs AI model, with real money and an
audit trail**: "Claude vs GPT vs DeepSeek: $25,000 escrow, 40 hidden tests, 48
hours, live." This is SWE-bench with stakes and a scoreboard — benchmark discourse
is already viral among devs, and money + liveness makes it legible to everyone else.
Labs and toolmakers will *pay to sponsor* pools (marketing budget, not bounty
budget). Every match produces clips, a winner, a controversy, and a dataset.
- Poolproof's holdout mechanism is precisely what makes public benchmarks
  ungameable — that's a genuine technical differentiator to headline.

### Loop 6 — Geographic ignition: Korea first, by design
The Korean-aware specs (josa, slugify-korean) and the 콜로세움 frame aren't
incidental — they're a wedge. Korea has the densest esports-viewing, dev-bootcamp,
and speculation-native culture on earth, plus tight media loops (Kakao, Naver
cafés, 개발자 YouTube). Launch the Arena as a Korean cultural product first —
"AI 콜로세움" is a *show*, not a website — win the local narrative, then export
the format the way K-content exports: subtitle the spectacle, localize the specs.
Japan (similar OSS + otaku-spectacle dynamics) second, then EN-global via the
Agent Arena.

**The compounding rule:** every feature must answer "what does the share artifact
look like?" before it ships. No share artifact → not a growth feature → deprioritize.

---

## 4. Product roadmap (what actually gets built, in order)

### Now → 90 days: make the spectacle real
1. **Finish network isolation** (stated last sandbox layer) → unlocks self-serve
   submissions. Nothing scales while submissions are hand-vetted. *This is the
   single gating item for everything below.*
2. **Self-serve git-connected submission** (already the stated next milestone) —
   builder connects repo, runner pulls at SHA, runs public+holdout, splits on green.
3. **Green Moment cards** (Loop 1) + public **Red Wall** (Loop 2) + run-reel GIFs.
4. **Arena v1 productized:** generalize the `wordle-solver` slug-hack
   (`src/app/p/[slug]/page.tsx` hardcodes `arena = p.slug === "wordle-solver"`)
   into a real `mode: escrow | arena` on the project model — ticket purchase,
   prize pool, countdown, live run feed, replay page.
5. **Run 4 arena events** (biweekly): 2 Korean-audience (Kakao/Naver seeded),
   1 OSS-issue-based, 1 "AI vs AI" pilot. Instrument everything (§6).

### 90 → 270 days: open the market
6. **GitHub App + fund-this-issue badge** (Loop 4).
7. **Spec Studio:** LLM-assisted spec authoring (issue → draft acceptance suite →
   human review → published spec). Cuts the scarcest input — good executable
   specs — from days to an hour, and makes the 3% royalty accessible to non-experts.
8. **Agent API v0:** authenticated endpoints for agents to claim slots, stake,
   submit, and get run verdicts. Position: *the* place an autonomous agent can
   legally earn money for verified work.
9. **Builder/author profiles + reputation graph** (green rate, holdout survival
   rate, earnings) — the LinkedIn-of-verified-shipping nobody can fake.
10. **Sponsored pools** sales motion: AI labs, dev-tool cos, cloud credits.

### 270 → 720 days: become the rails
11. **Verification-as-a-Service:** white-label escrow+holdout runs for agent
    marketplaces and enterprise ("pay your AI vendor on green"). Per-run pricing.
12. **Multi-language runners** (Python first — where the agents are), then
    containers-as-spec for full-stack acceptance.
13. **Annuity market v2:** the 15% maintenance annuity becomes a tradeable
    claim on ongoing green status — recurring revenue attached to every payout.
    (Regulatory review first; see §7.)
14. **Arena as media property:** seasons, team franchises, broadcast deals.
    License the format internationally (the K-content export playbook).

---

## 5. Fundraising narrative (what we tell investors at each stage)

- **Seed ($2–4M):** "Twitch-meets-escrow for the AI coding era. Watch the arena
  numbers: X k concurrent viewers, Y% viewer→backer conversion, $Z GMV in 6
  months with zero paid acquisition." Lead with spectacle metrics + the loop.
- **Series A ($15–25M):** "The verification oracle has N thousand immutable runs,
  a spec-author creator economy paying real royalties, and the GitHub App put the
  green badge in M repos. GMV growing X% m/m; take-rate holding at 8%."
- **Series B+:** "We are the settlement standard for agentic software work. The
  API processes more verification-dollars than the marketplace. Comps: Stripe
  (rails), Polymarket (oracle+spectacle), Upwork (what we replace)."

---

## 6. Metrics that matter (in priority order)

1. **Weekly Greens** — the heartbeat. Everything exists to grow this number.
2. **K-factor of the Green Moment** — shares per payout × signups per share.
   Target ≥0.4 by day 90, ≥1.0 during arena events.
3. **Viewer → backer conversion** (arena funnel) — target 3% early, 8% mature.
4. **Time-to-green** per spec — the market's clearing speed; falling = healthy.
5. **Spec author royalty run-rate** — supply-side loop health; when 100 authors
   earn >$100/mo, spec supply is self-sustaining.
6. **GMV, take, refund rate** — refund rate is a *feature* (trust) up to ~40%;
   above that, specs are miscalibrated.
7. **Holdout kill rate** — % of submissions green-on-public but red-on-holdout.
   This is the oracle's credibility statistic; publish it.

---

## 7. Risks and how we defuse them

| Risk | Reality | Mitigation |
|---|---|---|
| **Regulatory (escrow/gambling)** | Arena tickets + backing sides can look like wagering; annuity claims can look like securities. | Polar as MoR + credits-not-currency helps but is not sufficient at scale. Engage fintech counsel **before** Arena v1 takes real money for AI-vs-AI matches. Structure arena as prize competition (skill-based, sponsor-funded prizes) — jurisdiction-by-jurisdiction gating. Keep annuity v2 behind regulatory review. |
| **Sandbox escape** | One malicious submission that exfiltrates or escapes ends the trust story. | Network isolation before self-serve, ever. Add: syscall filtering, per-run ephemeral VMs at scale, third-party audit + public bounty on the sandbox itself (the audit *is* marketing). |
| **Oracle gaming** | Builders overfit; spec authors could collude with builders (write spec, leak holdouts, split 77%). | Holdouts already counter overfitting. Add: holdout rotation, author/builder collision detection, slash builder stakes on detected leak, publish the kill-rate stat. |
| **Cold start** | Two-sided markets die quiet. | That's what the concierge tests are — keep hand-running pools until Weekly Greens ≥ 5 organically. Spectacle (arena) generates demand without needing marketplace liquidity. |
| **GitHub dependency** | Loops 4 lives on their platform. | Badge + App follow ToS; diversify to GitLab; the runner and oracle are ours regardless. |
| **AI labs build it themselves** | A lab could ship "verified agent work" internally. | Labs are *competitors to each other* — none will trust another's oracle. Neutrality is the moat; sell to all of them (Switzerland strategy). |
| **Spectacle fatigue** | Arena novelty decays. | Format iteration cadence (seasons, new game types, celebrity specs) + the escrow market doesn't depend on the arena after ignition. |

---

## 8. The 90-day scoreboard (commit to these publicly)

- [ ] Network isolation shipped; sandbox writeup published (technical marketing).
- [ ] Self-serve submission live for ≥3 specs.
- [ ] Green Moment share cards + Red Wall live.
- [ ] `mode: arena` generalized out of the wordle-solver hack.
- [ ] 4 arena events run; ≥1,000 cumulative live viewers; ≥3% viewer→backer.
- [ ] 1 AI-vs-AI match executed end-to-end with a sponsored prize pool.
- [ ] GitHub fund-this-issue badge prototype in ≥10 external issue threads.
- [ ] 25 Weekly Greens run-rate; K-factor ≥0.4 measured, not vibes.
- [ ] Fintech counsel engaged; arena prize structure memo done.

If the arena events don't clear 3% viewer→backer or the K-factor stays <0.2 after
four events, the spectacle wedge is wrong — fall back to Loop 4 (fund-this-issue)
as the primary engine and treat the arena as a quarterly marketing event instead.
The escrow mechanism and oracle are the company; the arena is the megaphone.
