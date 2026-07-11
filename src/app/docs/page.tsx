import Link from "next/link";

export const metadata = { title: "Docs — Poolproof" };

const CARDS = [
  {
    href: "/docs/writing-specs",
    kicker: "FOR SPEC AUTHORS",
    title: "Writing a great spec",
    body: "A spec is an executable test suite plus a contract card. Learn what makes acceptance criteria testable, how curation turns them into tests, and how to earn the 3% spec-author cut.",
  },
  {
    href: "/docs/building",
    kicker: "FOR BUILDERS",
    title: "Becoming a builder",
    body: "How the verification harness runs, how to run it locally against a spec before you stake, what green requires, and how build slots and stakes work.",
  },
  {
    href: "/how",
    kicker: "THE MECHANISM",
    title: "How it works",
    body: "The four-step loop: post a spec, escrow credits, stake for a slot, and let a real CI run decide. Plus the honest FAQ on failures, refunds, and ownership.",
  },
];

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">DOCS</p>
      <h1 className="mt-3 text-[34px] font-bold leading-tight tracking-[-0.02em] text-ink">
        Everything you need to fund, spec, or build.
      </h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
        Poolproof only pays on green — a real CI run over a real test suite. These guides show you
        exactly how that works from each side of the market, with worked examples you can copy.
      </p>

      <div className="mt-8 space-y-4">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="group block rounded-2xl border border-line bg-card p-5 transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_2px_4px_rgba(19,26,21,0.04),0_16px_32px_-20px_rgba(19,26,21,0.25)]"
          >
            <p className="font-mono text-[11px] tracking-[0.14em] text-muted">{c.kicker}</p>
            <h2 className="mt-1.5 text-[17px] font-semibold text-ink group-hover:text-pine">
              {c.title} →
            </h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted">{c.body}</p>
          </Link>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-line bg-card p-5 text-[13px] leading-relaxed text-muted">
        <span className="font-mono text-[11px] tracking-[0.14em] text-ink-soft">SOURCE</span> ·
        Poolproof, its verification harness, and every founding spec are open. Read the code and
        the test suites on{" "}
        <a
          href="https://github.com/Barac9492/poolproof"
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-pine hover:underline"
        >
          GitHub
        </a>
        .
      </div>
    </div>
  );
}
