"use client";

import { useTransition, useOptimistic } from "react";
import { predictAction } from "@/lib/actions";
import { buildPredictionText } from "@/lib/grid";
import ShareGrid from "@/components/ShareGrid";
import type { Pick } from "@/lib/db";

// Free predict-the-winner — zero stakes, ever. The only payout is a streak.
// This is the conversion event that turns a lurker into a returning viewer.
export default function PredictionPanel({
  id,
  slug,
  builder,
  open,
  green,
  red,
  mine,
  signedIn,
  streak,
}: {
  id: number;
  slug: string;
  builder: string;
  open: boolean;
  green: number;
  red: number;
  mine: { pick: Pick; resolved: boolean; correct: boolean | null } | null;
  signedIn: boolean;
  streak: number;
}) {
  const [pending, startTransition] = useTransition();
  const [opt, setOpt] = useOptimistic(
    { green, red, mine },
    (state, pick: Pick) => {
      if (state.mine && state.mine.resolved) return state;
      const hadPrev = state.mine?.pick;
      let green = state.green;
      let red = state.red;
      if (hadPrev === "green") green--;
      if (hadPrev === "red") red--;
      if (pick === "green") green++;
      else red++;
      return { green, red, mine: { pick, resolved: false, correct: null } };
    }
  );

  function cast(pick: Pick) {
    startTransition(async () => {
      setOpt(pick);
      await predictAction(id, pick);
    });
  }

  const total = opt.green + opt.red;
  const greenPct = total > 0 ? Math.round((opt.green / total) * 100) : 50;

  return (
    <div className="rounded-2xl border border-line bg-card p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-[11px] tracking-[0.14em] text-muted">
          PREDICT THE WINNER
        </h3>
        <span className="text-[11.5px] text-faint">no stakes — just bragging rights</span>
      </div>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        Will @{builder} land green before the slot expires?
      </p>

      {opt.mine?.resolved ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line-strong/60 bg-paper-deep/40 px-4 py-3">
          <span className="text-[13.5px] font-medium text-ink">
            You called {opt.mine.pick === "green" ? "🟩 GREEN" : "🟥 RED"} —{" "}
            <span className={opt.mine.correct ? "text-pine" : "text-fail"}>
              {opt.mine.correct ? "correct ✓" : "wrong ✕"}
            </span>
            {opt.mine.correct && streak > 1 && (
              <span className="ml-1.5 text-muted">🔥 {streak}-streak</span>
            )}
          </span>
          <ShareGrid
            text={buildPredictionText(slug, opt.mine.pick, !!opt.mine.correct, streak)}
            compact
          />
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              disabled={!open || pending}
              onClick={() => cast("green")}
              className={`rounded-xl border px-4 py-3 text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                opt.mine?.pick === "green"
                  ? "border-pine bg-pine-soft text-pine-deep"
                  : "border-line bg-paper hover:border-pine/40 hover:bg-pine-soft/50"
              }`}
            >
              🟩 GREEN
            </button>
            <button
              disabled={!open || pending}
              onClick={() => cast("red")}
              className={`rounded-xl border px-4 py-3 text-[14px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                opt.mine?.pick === "red"
                  ? "border-fail bg-fail-soft text-fail"
                  : "border-line bg-paper hover:border-fail/40 hover:bg-fail-soft/50"
              }`}
            >
              🟥 RED
            </button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-fail-soft">
            <div className="h-full bg-pine transition-all" style={{ width: `${greenPct}%` }} />
          </div>
          <p className="mt-1.5 text-[12px] text-faint">
            {total > 0
              ? `${greenPct}% picked GREEN · ${total} prediction${total === 1 ? "" : "s"}`
              : "be the first to call it"}
          </p>
          {!open && <p className="mt-2 text-[12px] text-faint">predictions closed — slot already resolved</p>}
          {!signedIn && open && (
            <p className="mt-2 text-[12px] text-faint">sign in to make your call</p>
          )}
        </>
      )}
    </div>
  );
}
