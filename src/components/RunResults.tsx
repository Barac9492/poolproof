import type { RunWithResults } from "@/lib/db";
import { buildRunGrid } from "@/lib/grid";
import ShareGrid from "@/components/ShareGrid";

export default function RunResults({ runs, slug }: { runs: RunWithResults[]; slug: string }) {
  if (runs.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h3 className="font-mono text-[11px] tracking-[0.14em] text-muted">VERIFICATION RUNS</h3>
        <span className="text-[12px] text-faint">real executions — not an AI reading a diff</span>
      </div>
      <div className="divide-y divide-line/60">
        {runs.map((run) => (
          <details key={run.id} open={run.status === "green"} className="group">
            <summary className="flex cursor-pointer items-center gap-3 px-5 py-3.5 transition hover:bg-paper/60">
              <span
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold tracking-wide ${
                  run.status === "green" ? "bg-pine text-white" : "bg-fail-soft text-fail"
                }`}
              >
                {run.status.toUpperCase()}
              </span>
              <span className="text-[13.5px] text-ink-soft">
                run #{run.id} · <span className="font-mono text-[12.5px]">{run.submission}</span>
              </span>
              <span className="ml-auto flex items-center gap-2.5">
                <ShareGrid text={buildRunGrid(slug, run, run.results, run.builder).text} compact />
                <span className="font-mono text-[11.5px] text-faint">
                  {run.passed}/{run.passed + run.failed} · {run.created_at} UTC
                </span>
              </span>
            </summary>
            <ul className="border-t border-line/60 bg-paper/50 py-1">
              {run.results.map((r, resultIndex) => (
                <li key={r.id} className="flex items-start gap-2.5 px-5 py-1.5 text-[13px]">
                  <span
                    className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${
                      r.status === "pass" ? "bg-pine-soft text-pine-deep" : "bg-fail-soft text-fail"
                    }`}
                  >
                    {r.status === "pass" ? "✓" : "✕"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className={r.status === "pass" ? "text-muted" : "font-medium text-ink"}>
                      {r.kind === "holdout"
                        ? `Hidden holdout #${run.results
                            .slice(0, resultIndex + 1)
                            .filter((item) => item.kind === "holdout").length}`
                        : r.name}
                    </span>
                    <span className="ml-2 font-mono text-[10px] text-faint">{r.kind}</span>
                    {r.detail && r.kind !== "holdout" && (
                      <pre className="mt-1 overflow-x-auto rounded-lg bg-ink px-3 py-2 font-mono text-[11px] leading-relaxed text-fail-soft">
                        {r.detail}
                      </pre>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
