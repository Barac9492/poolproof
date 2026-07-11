import type { AcceptanceTest } from "@/lib/db";

export default function TestList({ tests }: { tests: AcceptanceTest[] }) {
  const publicTests = tests.filter((t) => t.kind === "public");
  const holdoutCount = tests.filter((t) => t.kind === "holdout").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h3 className="font-mono text-[11px] tracking-[0.14em] text-muted">ACCEPTANCE TESTS</h3>
        <span className="text-[12px] text-faint">the spec is the test suite</span>
      </div>
      <ul className="divide-y divide-line/60">
        {publicTests.map((t, i) => (
          <li key={t.id} className="flex items-center gap-3 px-5 py-3 text-[13.5px] text-ink-soft">
            <span className="font-mono text-[11px] text-faint">{String(i + 1).padStart(2, "0")}</span>
            {t.name}
            <span className="ml-auto rounded-full bg-paper-deep px-2 py-0.5 font-mono text-[10px] text-muted">
              public
            </span>
          </li>
        ))}
        {holdoutCount > 0 && (
          <li className="flex items-center gap-3 bg-slot-soft/40 px-5 py-3 text-[13px] text-muted">
            <span className="font-mono text-[11px] text-slot">+{holdoutCount}</span>
            hidden holdout tests — revealed only in run results. Overfit the public suite and these
            catch you.
          </li>
        )}
      </ul>
    </div>
  );
}
