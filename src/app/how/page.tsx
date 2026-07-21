import Link from "next/link";

export const metadata = { title: "How it works — Poolproof" };

const STEPS = [
  {
    n: "01",
    title: "A wish becomes an executable spec",
    body: "Ideas don't get funded — specs do. Every project is a public acceptance-test suite plus a plain-language contract card (\"you get / you don't get\"). Spec authors stake collateral and earn 3% of the payout. Disputes are judged against the card, not vibes.",
  },
  {
    n: "02",
    title: "Backers escrow, nothing is spent",
    body: "Pledges pool into escrow. Not equity, not tokens — and unlike attempt-funding platforms, not a lottery ticket either. If nothing ever goes green by the deadline, every credit comes back.",
  },
  {
    n: "03",
    title: "A builder stakes for an exclusive slot",
    body: "Any builder — AI agent shop, human, hybrid — stakes 5% of the pool for a time-boxed exclusive slot. No wasteful racing: one slot at a time, next in queue on timeout. The builder pays for their own compute. Their risk, their upside: 74% of the pool on green.",
  },
  {
    n: "04",
    title: "A real CI run decides — not an AI reading a diff",
    body: "The verification runner executes every test in an isolated process and accepts only a signed, complete result manifest: the public suite plus private holdouts that punish overfitting. All tests pass within both deadlines → escrow releases automatically: 74% builder, 15% maintenance reserve, 3% spec author, 8% platform. Any failure → RED, logged forever, slot keeps trying until it expires.",
  },
];

const FAQ = [
  {
    q: "Can't a builder just code to the tests?",
    a: "To the public ones, sure — that's the point, they're the spec. The private holdout suite catches overfitting, and the runner rejects candidate-controlled output, missing tests, or an early exit before any payout can occur.",
  },
  {
    q: "What if no builder ever goes green?",
    a: "Escrow refunds in full at the deadline. Backers lose nothing but time. Builders who timed out lose part of their stake — they carried the execution risk, as designed.",
  },
  {
    q: "Who maintains it after green?",
    a: "15% of every pool is credited to a platform-managed maintenance reserve. Monthly streaming is not active in the public beta; a future program must publish its rules before reserve credits can move.",
  },
  {
    q: "Who owns the output?",
    a: "Everything ships MIT-licensed with the exact test suite it was verified against. The IP status of AI-generated code is unsettled law — treat it as a public good.",
  },
];

export default function HowPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
        THE MECHANISM
      </p>
      <h1 className="mt-3 text-[38px] font-bold leading-tight tracking-[-0.02em] text-ink">
        From useful idea to verified outcome.
      </h1>
      <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
        Crowdfunding platforms for AI-built software sell <em>attempts</em> — you pay, an agent
        tries, and &ldquo;shipped&rdquo; means the agent said so. Poolproof inverts the risk:
        backers fund <em>outcomes</em>, builders carry execution risk, and a real test run is the
        only judge.
      </p>

      <ol className="mt-10 space-y-4">
        {STEPS.map((s) => (
          <li key={s.n} className="flex gap-5 rounded-2xl border border-line bg-card p-6">
            <span className="font-mono text-[22px] font-bold text-pine">{s.n}</span>
            <div>
              <h2 className="text-[16.5px] font-semibold tracking-tight text-ink">{s.title}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-12">
        <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
          HONEST FAQ
        </p>
        <h2 className="mt-2 text-[24px] font-bold tracking-tight text-ink">
          Questions a careful backer asks.
        </h2>
        <dl className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
          {FAQ.map((f) => (
            <div key={f.q} className="p-5">
              <dt className="text-[14.5px] font-semibold text-ink">{f.q}</dt>
              <dd className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{f.a}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mt-10 rounded-2xl bg-ink p-8 text-center">
        <h2 className="text-[20px] font-bold tracking-tight text-white">
          Ready to fund an outcome?
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-[13px] leading-relaxed text-white/60">
          Post a spec or put credits behind one — either way, not one credit moves until the tests
          go green.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            href="/submit"
            className="rounded-lg bg-pine px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-pine-deep"
          >
            Post a spec
          </Link>
          <Link
            href="/"
            className="rounded-lg border border-white/20 px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-white/10"
          >
            Browse pools
          </Link>
        </div>
      </div>
    </div>
  );
}
