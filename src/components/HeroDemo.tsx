"use client";

import { useEffect, useState } from "react";

const TESTS = [
  "parses the commented config",
  "round-trips without loss",
  "holdout: rejects malformed input",
];

// One product loop, self-running: tests go green one by one → escrow releases.
// phase: 0..TESTS.length = ticking tests; TESTS.length+1 = released; then reset.
export default function HeroDemo() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = setTimeout(
      () => setPhase((p) => (p > TESTS.length + 2 ? 0 : p + 1)),
      phase === 0 ? 1100 : phase <= TESTS.length ? 850 : 1900
    );
    return () => clearTimeout(t);
  }, [phase]);

  const released = phase > TESTS.length;

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-5 shadow-[0_1px_2px_rgba(19,26,21,0.04),0_12px_32px_-16px_rgba(19,26,21,0.18)]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] tracking-[0.14em] text-muted">
          VERIFICATION RUN
        </span>
        <span
          className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] tracking-wide transition-colors duration-300 ${
            released ? "bg-pine text-white" : "bg-paper-deep text-ink-soft"
          }`}
        >
          {released ? "GREEN" : "RUNNING"}
        </span>
      </div>

      <ul className="mt-4 space-y-2.5">
        {TESTS.map((name, i) => {
          const done = phase > i;
          return (
            <li key={name} className="flex items-center gap-2.5 text-[13.5px]">
              {done ? (
                <span className="pp-pop flex h-5 w-5 items-center justify-center rounded-full bg-pine text-[11px] font-bold text-white">
                  ✓
                </span>
              ) : (
                <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line-strong">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-faint" />
                </span>
              )}
              <span className={done ? "text-ink" : "text-muted"}>{name}</span>
              {i === TESTS.length - 1 && (
                <span className="ml-auto font-mono text-[10px] text-faint">hidden</span>
              )}
            </li>
          );
        })}
      </ul>

      <div className="mt-5 border-t border-line pt-4">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-[11px] tracking-[0.14em] text-muted">ESCROW</span>
          <span
            className={`font-mono text-sm font-semibold transition-colors duration-300 ${released ? "text-pine" : "text-ink"}`}
          >
            {released ? "→ released" : "4,000 cr held"}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-deep">
          <div
            className="h-full rounded-full bg-pine transition-all duration-700 ease-out"
            style={{ width: released ? "100%" : "0%", opacity: released ? 1 : 0.4 }}
          />
        </div>
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-faint">
          {released
            ? "74% builder · 15% maintenance · 3% spec author · 8% platform"
            : "not one credit moves until every test passes"}
        </p>
      </div>
    </div>
  );
}
