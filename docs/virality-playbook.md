# The Virality Playbook

**Premise:** virality is the only goal. Korea-first, arena-first, **no payouts**
(reputation + sponsor prizes only — the legally clean model from
`docs/legal-launch-requirements.md`). Everything below is ranked by
shares-per-unit-of-effort. Anything that doesn't produce a share artifact
doesn't ship.

**North star:** clips shared per week. Secondary: K-factor (signups per share ×
shares per viewer), return rate to the next match. GMV is not a metric here.

---

## The one loop

```
콜로세움 match → the green-flip clip → shared → new viewers
     ↑                                              ↓
next match bigger ← new challengers enter ← "my agent could do that"
```

Every move below either makes the clip better, makes sharing easier, or turns
a viewer into a challenger. Nothing else exists.

---

## The ten moves, in order

### 1. Design the Green Flip as *the* clip
The moment the bar flips green is the entire brand. Auto-generate a ~10-second
replay for every run: test names cascading (red… red… green green green), the
bar flip, elapsed time, the winner's handle. One visual format, never varied —
the Wordle-grid principle: **compressed, legible, instantly recognizable in a
feed at half attention.** The format itself becomes the meme carrier.
- Build: extend `src/app/opengraph-image.tsx` into per-run result cards +
  an MP4/GIF run-reel endpoint. One-tap share to X/카카오톡/Instagram.

### 2. Fixed-time weekly live event
같은 요일, 같은 시간 — appointment viewing, Korean streaming culture native
(치지직 / 유튜브 라이브 simulcast). A show has episodes; a website doesn't.
Countdown to the next match replaces the landing page hero.

### 3. AI vs AI is the headline format
"Claude vs GPT vs DeepSeek — 누가 먼저 green?" Model-stan wars are free
distribution: every AI hype account on X and every 개발 커뮤니티
(GeekNews, 커리어리, OKKY) reposts model-vs-model results unprompted. The
holdout mechanism is the credibility hook — *this* benchmark can't be gamed,
and that claim itself is shareable discourse bait.

### 4. Predict-the-winner (free — no stakes, ever)
Viewers pick a side before the match. Zero money in either direction
(the §3 gambling line stays absolute): rewards are streaks, badges, ranks.
Then the share artifact writes itself: **"I called it — 7 match streak 🟩"**.
Prediction cards are the Wordle-share of the spectator side, and prediction
is the conversion event that turns a lurker into a returning viewer.

### 5. The Red Wall — failure is the better clip
"9/10 public tests green… died on hidden test #3" outperforms victory footage.
Every red gets the same auto-clip treatment as greens. The permanent public
failure log is both content and the trust story in one artifact.

### 6. Open challenger call — UGC supply loop
"Your agent thinks it's good? Entry is free. Get ranked." Frictionless entry
(git URL, runner does the rest — needs the sandbox milestone) turns viewers
into contestants. Every entrant brings their own audience rooting for them.

### 7. Specs must be memes
A spec qualifies for the arena only if a non-developer understands it in one
sentence: 맞춤법 교정기, 수능 국어 문제, wordle-solver (already live), 로또
번호 절대 안 겹치게 나누기. The josa spec proves the pattern — Korean-language
challenges are simultaneously locally resonant and globally exotic (subtitled
K-content export logic). Save ISO-8601 parsing for the marketplace later;
the arena runs crowd-pleasers.

### 8. The share-artifact rule (process, not feature)
Every PR that touches product answers one question in its description:
**"what does the share card for this look like?"** No answer → not a
virality feature → doesn't ship in arena scope.

### 9. Creator co-hosts, not creator ads
개발 유튜버/스트리머 co-host a match and field their own agent (or their
audience's). Their fans arrive as partisans, not viewers. Sponsored pools get
the built-in 유료광고 disclosure banner (already flagged in the legal doc) so
this scales without FTC/표시광고법 friction.

### 10. Seasons and a ladder
Rankings are self-sharing — people screenshot their own rank. Season structure
(시즌 1, finals, relegation) gives every match table stakes and gives the
recap clip a narrative. Season finale = the tentpole event sponsors pay for.

---

## What this deletes

- Escrow bars, credit balances, and finance widgets from arena pages — the
  `wordle-solver` slug-hack becomes the default arena layout, not the exception.
- The landing page as product explainer → becomes next-match countdown + last
  match's best clip + the ladder.
- Any roadmap item whose output isn't a clip, a card, or a rank. (The escrow
  marketplace stays parked in `docs/unicorn-virality-plan.md` for later; it is
  not part of this phase.)

## Build order (smallest set that completes the loop)

1. Green-flip / red-death auto-clip + share cards (move 1, 5)
2. Arena mode generalized out of the wordle-solver hack + countdown landing
3. Prediction picks + streak badges + share card (move 4)
4. Ladder page (move 10)
5. Self-serve challenger entry — gated on the network-isolation sandbox work
6. First fixed-time live match with a creator co-host (moves 2, 3, 9)

## The measurement that decides everything

Run the weekly match, measure: clips shared, K-factor, % of viewers who made a
prediction, % who return next week. **If four consecutive events don't move
sharing week-over-week, change the *format* of the clip and the spec-memes —
not the mechanism.** The loop is the hypothesis; the clip is the variable.
