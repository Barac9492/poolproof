# Poolproof — Legal Launch Requirements

**Status:** operating checklist, prepared 2026-07-12
**Scope:** everything legally required to take Poolproof from public beta (sandbox
payments, vetted builders) to a real-money, global, arena-running business per
`docs/unicorn-virality-plan.md`.

> **This document is not legal advice.** It was prepared by an AI assistant to
> structure the problem, sequence the work, and make counsel time efficient. Every
> conclusion below is a *hypothesis to verify with licensed counsel* in each relevant
> jurisdiction before real money moves. Items marked **⚖️ COUNSEL** cannot be resolved
> without a lawyer. Items marked **✍️ FOUNDER** are acts only the founder can perform
> (signatures, filings, registrations).

---

## 0. How to read this: the three legal centers of gravity

Poolproof has three mechanics that each sit near a regulated activity. Everything
else is ordinary startup hygiene.

| Mechanic | Nearby regulated activity | Severity if wrong |
|---|---|---|
| Pooled credits → escrow → split payout to builders | **Money transmission** (US federal + 49 states; Korea 전자금융거래법) | Criminal exposure (18 U.S.C. §1960), platform shutdown |
| Arena: tickets, prize pools, backing outcomes | **Gambling / wagering** (state law; Korea 사행행위규제법) | Criminal exposure, app-store bans, payment-processor termination |
| 15% maintenance annuity as a tradeable claim; anything giving backers "upside" | **Securities** (Howey; Korea 자본시장법) | SEC/FSC enforcement, rescission liability |

The launch sequence in §12 is designed so that **no real-money feature ships before
its center of gravity is resolved.** The beta as currently built (sandbox payments,
credits with "no cash value," vetted builders, no viewer wagering) is deliberately
on the safe side of all three lines — keep it there until each gate below is passed.

---

## 1. Entity formation — the first domino

Nothing else (bank account, Polar production agreement, counsel engagement, payout
partner onboarding, trademark) can happen without a legal entity. Today the site's
Terms name no entity at all — users currently contract with nobody, which is itself
a defect to fix at incorporation.

**Structure decision (✍️ FOUNDER + ⚖️ COUNSEL):** given a Korea-based founder
targeting global users and (per the unicorn plan) US venture capital:

- **Recommended default: Delaware C-corp as parent** (Stripe Atlas or Clerky,
  ~$500, days). US VCs effectively require it; Polar, Stripe Connect, and most
  payout partners onboard US entities most smoothly.
- **Korean subsidiary (주식회사) or branch later**, when Korean employees, Korean
  PG integration (Kakao Pay/Toss), or the 콜로세움 media business make it
  necessary — not before.
- **Korea-specific trap (⚖️ COUNSEL — Korean):** a Korean-resident founder holding
  shares of a foreign corporation must file a **foreign direct investment /
  overseas securities acquisition report under the Foreign Exchange Transactions
  Act (외국환거래법)** with a foreign exchange bank, generally *before or promptly
  upon* acquisition. Missing this is a common, fixable-but-painful founder mistake.
  Get a Korean FX/tax advisor before signing the Atlas paperwork, not after.
- If US fundraising is *not* the plan, a Korean 주식회사 alone is cheaper and
  simpler — but it makes the arena and payout partner options harder, and most of
  this document assumes the Delaware route.

**Formation checklist (✍️ FOUNDER):**
- [ ] Incorporate (Atlas/Clerky) · EIN · registered agent
- [ ] Founder stock purchase + **83(b) election within 30 days** (US) — irreversible deadline
- [ ] **IP assignment** from founder to company covering the entire poolproof repo,
      the poolproof.dev domain, and the brand (the repo is MIT-licensed code, but the
      brand, specs authored by you, and the deployment must be company property)
- [ ] Korean FX report (외국환거래법) via your bank, if Korea-resident
- [ ] Business bank account (Mercury/Brex) — required before Polar production
- [ ] Update site Terms to name the entity, and re-execute the Polar agreement
      under the entity, not the individual

---

## 2. Money transmission — the existential question

**The problem in one sentence:** taking value from backers, holding it in escrow,
and later transmitting 74/15/3/8 shares to *other people* (builders, spec authors)
is the textbook definition of money transmission — a federally registered
(FinCEN MSB) and state-by-state licensed activity (~49 licenses, 18+ months,
capital + surety bonds). Doing it unlicensed is a federal crime (18 U.S.C. §1960).
**Poolproof must be structured so it never does this itself.**

What Polar (Merchant of Record) does and does not solve:
- ✅ Solves: the *sale of credits* (Polar is the seller, handles cards, sales tax/VAT,
  chargebacks).
- ❌ Does not solve: **paying builders and spec authors.** The moment Poolproof
  receives pooled funds and pays them out to third parties, Polar's MoR status is
  irrelevant — that's Poolproof transmitting money.

**Three viable structures (⚖️ COUNSEL — US fintech, pick one before any real payout):**

1. **Licensed payout partner holds all funds (recommended).** Funds from credit
   sales settle into accounts controlled by a licensed program partner —
   e.g. Stripe Connect (platform model), Dots, Trolley, or a BaaS sponsor bank.
   Escrow "pools" are ledger entries against the partner's FBO account; on green,
   the *partner* executes the split per Poolproof's instruction. Poolproof is a
   software layer that never takes possession. This is how Kickstarter, Patreon-like
   platforms, and marketplaces avoid MTL. Builder/spec-author onboarding then also
   inherits the partner's KYC (§6).
2. **True closed-loop + prize structure.** Credits are never redeemable for cash by
   anyone (pure platform fuel — closest to today's beta), and builder compensation
   is recharacterized as a *prize/service fee* paid by the company from its own
   revenue, sized by the pool. Cleaner on MTL, but muddier on gambling (§3) and it
   caps the marketplace at "the company pays contractors." Workable for Stage B
   scale, not for the settlement-rails endgame.
3. **Agent-of-payee structuring.** Poolproof as the builder's limited payment agent
   (payment to platform = payment to builder). Exemptions vary state by state and
   are narrow; genuinely needs counsel per state. Usually combined with #1 anyway.

**Korea (⚖️ COUNSEL — Korean):** if credits are sold to Korean users by a Korean
entity, prepaid credits may constitute **선불전자지급수단 (prepaid electronic payment
means)** under the Electronic Financial Transactions Act (전자금융거래법), requiring
FSC registration above thresholds (multi-merchant usability, balance limits), and
paying builders may constitute 전자지급결제대행 (PG) business. While the seller is the
US entity via Polar (MoR), exposure is reduced but *marketing into Korea* still
implicates Korean law — get a Korean fintech opinion before the Korean arena launch.

**Also in this bucket:**
- **Unclaimed property / escheatment (US state law):** unspent credit balances and
  expired-slot residue may be escheatable to states after dormancy periods; gift-card
  rules (federal CARD Act + state analogs) may limit expiry of purchased credits.
  Design decision needed: credits expire? dormancy fees? (⚖️ COUNSEL)
- The **"balances may be reset with notice"** clause in current Terms is only
  defensible while credits are free/no-cash-value. It must be removed for paid credits.

**Gate:** no real-money payout to any builder until structure #1/#2/#3 is chosen,
papered, and live. The beta's "vetted submissions, sandbox payments" posture is the
correct holding pattern.

---

## 3. Arena, prizes, and gambling law

The arena (tickets, prize pools, AI-vs-AI matches, "backing sides") walks next to
wagering law. The line that matters everywhere: **prize + chance + consideration =
illegal lottery/gambling.** The design rules that keep Poolproof on the right side:

1. **Competitors may pay to compete only in bona fide skill contests.** Builders
   (human or AI-operated) making a test suite pass is a skill contest — this is the
   same legal frame as coding competitions, Kaggle, and esports. Even so, a handful
   of US states restrict pay-to-enter skill contests (historically AZ, AR, CT, DE,
   LA, MD, ND, TN, VT in various configurations — verify current list, ⚖️ COUNSEL)
   → geo-gate entry fees, or make entry free with sponsor-funded prizes.
2. **Spectators must never win money.** Tickets = access to watch (fine, it's a
   media product). **"Backing sides" with any payout to the viewer if their side
   wins is pari-mutuel wagering — do not ship this, anywhere, in any form,**
   including credits, unless the company someday acquires actual gaming licenses.
   Viewer participation upside must be non-monetary: badges, leaderboard glory,
   free credits usable only for backing specs (⚖️ COUNSEL even for that).
3. **Sponsor-funded prize pools are the cleanest arena economics** (sponsor pays
   prize, viewers pay for the show) — this also matches the unicorn plan's
   "labs pay to sponsor matches" revenue line.
4. **Korea is stricter, not looser (⚖️ COUNSEL — Korean):** 사행행위 등 규제 및 처벌
   특례법 and related law criminalize offering games where participants stake value
   on chance outcomes; esports/skill prize competitions are lawful and common, but
   *any* viewer-side staking or paid raffle mechanics are radioactive. The 콜로세움
   must launch as **show + skill contest**, full stop. Prize competitions with paid
   entry may also implicate 상금 관련 소비자 규제; and broadcast/媒体 aspects are clean.
5. **Japan (phase 2 market):** 景品表示法 (Premiums and Representations Act) caps
   prize values tied to purchases; structure sponsor prizes to competitors (not
   customer premiums) to stay outside it (⚖️ COUNSEL — Japanese, later).
6. **Sweepstakes fallback:** any promotional giveaway to viewers needs no-purchase-
   necessary free entry (AMOE), official rules, and eligibility terms — standard
   sweepstakes hygiene if marketing ever runs one.

**Payment rails note:** card networks and PSPs (including Polar) have their own
gambling prohibitions stricter than law. Clear the arena model with Polar in
writing before selling arena tickets through them. (✍️ FOUNDER)

**Gate:** before the first real-prize arena event — a written **prize-competition
structure memo** from US counsel (+ Korean counsel for Korean-market events),
official contest rules published on-site, geo-gating for restricted states,
and Polar's written sign-off.

---

## 4. Securities law — keep every instrument dumb

Current posture is good: credits are prepaid utility ("not equity, not tokens, no
returns" — Terms §1), backers get software outcomes, not profit. Preserve it with
these hard rules:

- **Backers must never profit.** No resale of credits, no transferable positions,
  no "back early, earn more," no secondary market. The moment a backer can profit
  from others' efforts, Howey is satisfied and it's a security.
- **The 15% maintenance annuity as a *tradeable claim* (unicorn plan §4.13) is
  presumptively a security.** Do not build it without securities counsel; if built,
  it likely needs an exemption (Reg D to accredited investors) or full registration.
  It is correctly gated to the 270-720 day phase behind regulatory review — keep
  that gate.
- **Spec-author 3% royalties are compensation for services** (authoring the spec) —
  fine as earned income. Do **not** allow buying/selling of royalty streams.
- **Credits are not tokens.** No blockchain issuance, no transferability, or the
  analysis reopens under both securities and (in Korea) 가상자산이용자보호법.
- Kickstarter-style patronage (back a spec, get the software as MIT public good)
  is the settled-safe model — the JOBS Act crowdfunding regime is *not* needed
  because backers receive a product, not an investment.

**Gate:** annual securities-counsel review of any new mechanic that gives any
participant financial upside from anyone else's effort. (⚖️ COUNSEL)

---

## 5. Tax and information reporting

- **US entity income tax + Delaware franchise tax** — standard; get a startup
  accountant at incorporation. (✍️ FOUNDER)
- **Sales tax / VAT / GST on credit sales:** handled by Polar as MoR — one of the
  main reasons to keep Polar. Confirm arena *tickets* are also sold through Polar
  (they're a different product category; confirm MoR coverage in writing).
- **Builder/spec-author payouts (once real):**
  - US recipients: collect **W-9**, issue **1099-NEC** ≥ $600/yr (or the payout
    partner issues 1099-K per current thresholds — partner choice in §2 decides who
    reports; confirm current-year 1099-K thresholds, they've moved repeatedly).
  - Non-US recipients: collect **W-8BEN/W-8BEN-E**; assess withholding — for
    contractor services performed *outside* the US, generally no US withholding,
    but documentation is mandatory. (⚖️ COUNSEL/CPA)
  - **EU DAC7** platform-reporting obligations can attach if EU-resident builders
    earn through the platform — the payout partner often handles this; verify.
  - Korea: if a Korean entity later pays Korean builders, 3.3% 사업소득 withholding
    applies; the US-entity-pays-globally model defers this.
- **Backup withholding** for payees who fail documentation — the payout partner's
  onboarding must block payout until tax forms clear.
- **Korean founder personal tax (✍️ FOUNDER):** Korean residents owe Korean tax on
  worldwide income and must report overseas financial accounts over thresholds
  (해외금융계좌 신고). Coordinate US/Korea via the tax treaty with a cross-border CPA.

---

## 6. KYC, AML, and sanctions

Even with the MTL burden shifted to a payout partner (§2), Poolproof carries:

- **Sanctions compliance is strict-liability and applies to everyone.** No payouts
  to, and block platform use from, comprehensively sanctioned jurisdictions (Iran,
  North Korea, Cuba, Syria, Crimea/DNR/LNR regions). Implement IP geoblocking +
  payee screening (the payout partner screens payees against OFAC lists; Poolproof
  should still geoblock at signup for sanctioned regions). (✍️ FOUNDER: turn on
  geoblocking before real money.)
- **KYC on money recipients** (builders, spec authors): inherited from the payout
  partner's onboarding (Stripe Connect etc. does identity verification). Backers
  buying credits: Polar's problem as MoR, below thresholds.
- **AML red flags to design against:** using pools to move money (backer and
  builder are the same person — self-dealing wash: fund a spec, "win" it yourself,
  cash out clean money). **Mitigations to build:** same-identity detection between
  backer↔builder on a pool, payout partner AML monitoring, caps on early payout
  sizes, and the already-planned author/builder collusion detection.
- **Export controls:** publishing MIT-licensed source is generally outside EAR
  (published open source), but sanctions still prohibit *services* to sanctioned
  persons — the geoblock covers this.

---

## 7. Consumer protection

- **The refund promise is the brand — make it contractually exact.** "No green by
  deadline → full refund" is clean. Define in Terms: what "deadline" means (UTC
  timestamp on the project page), what the 48-hour review window is, who can
  dispute a green and how, and what happens on a *disputed* green (funds held
  pending resolution). Today's Terms don't cover disputed greens at all.
- **EU/UK consumers (when marketing there):** 14-day withdrawal right for digital
  purchases — credits purchased and *not yet pledged* should be refundable on
  request within 14 days regardless of pool outcomes (Polar as MoR handles some of
  this; align the site policy). Consumer terms must not be "materially unfair"
  (unilateral balance resets, again, must go).
- **FTC endorsement rules:** influencer-co-authored specs and sponsored arena pools
  must carry clear #ad/sponsorship disclosure — build the disclosure into the pool
  page template for sponsored pools, don't leave it to the influencer.
- **Korea 전자상거래법 (✍️ FOUNDER when Korean entity exists):** 통신판매업 신고
  (mail-order business registration), statutory footer disclosures (사업자등록번호,
  대표자, address, hosting provider), and Korean-language terms when targeting Korea.
- **Age gating:** Terms must require 18+ (contracts, payments, contest entry).
  Currently absent. Fix in the Terms rewrite (§10).

---

## 8. Builders and spec authors: contractor classification and platform contracts

- Builders/spec authors are **independent contractors / contest participants**, not
  employees: no control over hours/means, own equipment ("their compute, their
  risk"), non-exclusive, outcome-paid. Encode these facts in a **Builder Agreement**
  accepted at slot-staking, and a **Spec Author Agreement** at spec publication.
  (⚖️ COUNSEL drafts; templates below feed them.)
- Builder Agreement must contain: IP assignment/license grant on green (§9), reps &
  warranties (right to submit; no infringing/malicious code), stake-forfeiture
  consent, sandbox rules (no escape attempts — CFAA/computer-misuse acknowledgment),
  tax-form obligations, sanctions eligibility rep, dispute process.
- California AB5 note: outcome-based contest/marketplace participation is generally
  defensible, but have US employment counsel sanity-check the Builder Agreement once
  volume is real.

---

## 9. Intellectual property

- **Output licensing chain must be airtight.** Terms §4 says outputs publish under
  MIT — but nothing today obtains that right *from the builder*. The Builder
  Agreement must include: on green + escrow release, builder grants (a) MIT license
  to the public and (b) a broad license/assignment to the company sufficient to
  operate, relicense, and defend. Until then the platform is publishing code it has
  no license to.
- **Spec IP:** spec author licenses the spec (tests + contract card) to the platform
  irrevocably on publication (the 3% royalty is the consideration).
- **AI-generated code:** current US Copyright Office position — purely AI-generated
  output isn't copyrightable. MIT-publishing sidesteps most of it; the builder still
  *warrants non-infringement* regardless of authorship tooling.
- **DMCA safe harbor (✍️ FOUNDER, ~$6 + 10 minutes):** register a designated agent
  with the US Copyright Office, publish a takedown process and repeat-infringer
  policy. Cheap, mandatory for hosting third-party code submissions.
- **Trademark (✍️ FOUNDER):** clearance search then file "POOLPROOF" — USPTO
  (classes 9/35/36/41/42 shortlist with counsel) and KIPO; Madrid Protocol for
  expansion. Also secure the 콜로세움 arena brand you settle on. Do this before the
  arena becomes famous, not after.
- **Open-source hygiene:** the repo is MIT — keep a license scan (no GPL
  contamination in the runner/harness distributed paths).

---

## 10. Site legal documents — gap audit (against current pages)

Audit of `src/app/terms`, `/privacy`, `/refunds`, `/credits` as of today:

| Gap | Where | Severity | Fix |
|---|---|---|---|
| **Privacy policy misstates data collection** — claims "handle + salted password hash, no email required," but auth is GitHub/Google OAuth collecting verified email, name, avatar, provider IDs (`src/lib/oauth.ts`); payments add Polar billing data | `/privacy` | **High — active misrepresentation (FTC §5 / PIPA)** | **Fixed in this PR** — see updated privacy page |
| No entity named; no governing law, venue, or dispute resolution | `/terms` | High | Blocked on §1 incorporation; then Terms rewrite (⚖️ COUNSEL) |
| No limitation of liability, disclaimer of warranties (beyond outputs), or indemnification | `/terms` | High | Terms rewrite |
| No age requirement (18+) | `/terms` | High | Terms rewrite |
| No sanctions/geo eligibility clause | `/terms` | High before real money | Terms rewrite + geoblock |
| No acceptable-use / sandbox-abuse (CFAA) clause | `/terms` | Medium | Terms rewrite |
| No account termination / modification-of-terms / notice mechanics | `/terms` | Medium | Terms rewrite |
| "Balances may be reset with notice" | `/terms` §6 | OK in free beta; **unlawful for purchased credits** | Remove at Stage B |
| Disputed-green process undefined (who can challenge, what freezes) | `/terms` + `/refunds` | Medium | Terms rewrite |
| No DMCA policy page | site | Medium | Add with §9 agent registration |
| Public-forever ledger vs GDPR/PIPA erasure rights — position asserted but not legally framed (legitimate-interest analysis, pseudonymization stance) | `/privacy` | Medium | Privacy rewrite with counsel (§11) |
| Contest/arena official rules | none yet | High before first real-prize event | §3 memo → rules page |

**Sequencing:** the privacy accuracy fix ships now (this PR). The full Terms rewrite
is deliberately *not* drafted here — it needs the entity name, governing law choice,
and payout structure (§2) first; AI-drafted terms naming a nonexistent entity would
be worse than the current honest-minimalist page. Counsel drafts it at Stage B using
this audit as the spec.

---

## 11. Privacy and data protection

- **Korea PIPA (개인정보보호법)** applies to Korean users regardless of entity
  location: consent-based collection notices, purpose limitation, disclosure of
  overseas transfer (data hosted on Vercel/Turso in the US must be disclosed to
  Korean users), designation of a privacy officer (개인정보 보호책임자), breach
  notification (72h to KISA/individuals). Required at the Korean arena launch.
- **GDPR** (EU users, once marketed to): lawful bases mapped per processing purpose;
  the **permanent public ledger vs Art. 17 erasure** tension needs a documented
  position — the defensible line: handles are pseudonyms, users are warned pre-
  pledge, ledger integrity is a legitimate interest/legal-claims basis, and account
  deletion severs the identity link (current behavior, which is good — it just needs
  the legal write-up behind it). Add a DSR (data subject request) intake path.
- **CCPA/CPRA:** thresholds (revenue/volume) not yet met; revisit at scale.
- **Breach duties:** US state notification laws + GDPR/PIPA 72-hour clocks — have an
  incident-response one-pager before real money (who calls counsel, who notifies).
- **Data map to maintain:** OAuth identity data, session cookies, pledge/stake/run
  ledger (public by design), Polar customer/billing data (Polar is controller for
  payment data as MoR — reflect in privacy policy), payout-partner KYC data
  (partner is controller), server logs.

---

## 12. Staged launch sequence — what is legal when

**Stage A — now (public beta).** Sandbox payments only, credits free/no cash value,
vetted submissions, no viewer stakes. *Legal to operate today.* Required this stage:
- [x] Privacy policy accuracy fix (this PR)
- [ ] ✍️ Incorporate + IP assignment + FX report (§1)
- [ ] ✍️ Engage: (a) US fintech/payments counsel, (b) Korean corporate/fintech
      counsel, (c) cross-border CPA. Budget reality: ~$15–40k for the Stage B
      opinion set; do not launch real money on less.
- [ ] ✍️ DMCA agent registration; trademark clearance + filing
- [ ] Draft Builder & Spec Author Agreements (counsel, from §8–9 specs)

**Stage B — real money in, real payouts out.** Gates:
- [ ] Payout structure chosen and live (§2 — partner FBO model recommended)
- [ ] Terms rewrite naming entity, law, arbitration, 18+, sanctions, AUP (§10)
- [ ] Polar production agreement under the entity; written confirmation of MoR
      coverage for credits (and later tickets)
- [ ] Geoblocking (sanctioned regions) + payee KYC/tax-form gating live
- [ ] Refund/disputed-green process in Terms; "balance reset" clause removed
- [ ] Unclaimed-property/credit-expiry design memo (⚖️)

**Stage C — arena with real prizes.** Gates:
- [ ] Prize-competition structure memo (US + Korea) (§3)
- [ ] Official contest rules page; geo-gating of entry fees for restricted states
- [ ] Sponsor agreement template (prize funding, disclosure, IP/publicity)
- [ ] Polar/PSP written sign-off on ticket + prize flows
- [ ] **Hard product rule enforced in code: no viewer-side monetary winnings**
- [ ] Korean-market events: PIPA compliance set (§11) + Korean-language terms +
      (if Korean entity) 통신판매업 신고 (§7)

**Stage D — settlement API / annuity market / scale.** Gates:
- [ ] Securities opinion before any tradeable annuity claim (§4)
- [ ] Re-examine MTL posture: the API model ("we instruct partner to split for
      third-party platforms") changes the analysis — fresh counsel memo
- [ ] SOC 2 Type I→II (enterprise buyers will demand it), pen-test + sandbox audit
- [ ] Insurance: tech E&O + cyber (Stage B), D&O (at first financing), media
      liability (arena broadcasts)

---

## 13. Founder action list — the only-you items, in order

1. Choose structure & incorporate (§1) — everything is blocked on this.
2. File 83(b) (30-day fuse) and Korean FX report.
3. Open bank account; move Polar/Vercel/Turso/domain into the entity.
4. Engage the three advisors (US fintech counsel, KR counsel, cross-border CPA) —
   send them this document and `docs/unicorn-virality-plan.md` as the briefing.
5. Register DMCA agent; file trademarks.
6. Decide the §2 payout structure with counsel — this is *the* launch-blocking
   legal decision; everything in Stage B hangs off it.
7. Get Polar's written position on payouts, arena tickets, and prize flows.
8. Sign off the Terms rewrite and Builder/Spec Author Agreements.
9. Before the first real-prize 콜로세움: the §3 memo, in writing, both jurisdictions.

---

*Cross-reference: `docs/unicorn-virality-plan.md` §7 (risk table) — this document
is the expansion of its "Regulatory" row into an executable checklist.*
