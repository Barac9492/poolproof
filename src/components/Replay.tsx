"use client";

import { useEffect, useRef, useState } from "react";
import type { RunGrid } from "@/lib/grid";
import ShareGrid from "@/components/ShareGrid";

// The clip, v1 — no video infra. The latest run replays itself as a cascade:
// squares flip in one by one, then the verdict stamps. Auto-plays when it
// scrolls into view; the format is rigid on purpose (a stable canvas for the
// community to meme on). Holdout squares carry no names — the visible-but-
// unreadable row is the brand.
export default function Replay({ grid }: { grid: RunGrid }) {
  const cells = [...grid.publicCells, ...grid.holdoutCells];
  const total = cells.length;
  // null = not started yet (waiting to scroll into view)
  const [revealed, setRevealed] = useState<number | null>(null);
  const started = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);

  function play() {
    setRevealed(0);
  }

  // auto-play once, when the card enters the viewport
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !started.current) {
          started.current = true;
          play();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // the cascade: each revealed square schedules the next one
  useEffect(() => {
    if (revealed === null || revealed >= total) return;
    const t = setTimeout(() => setRevealed((n) => (n ?? 0) + 1), 340);
    return () => clearTimeout(t);
  }, [revealed, total]);

  const shown = revealed ?? 0;
  const done = revealed !== null && revealed >= total;
  const publicShown = Math.min(shown, grid.publicCells.length);
  const holdoutShown = Math.max(0, shown - grid.publicCells.length);

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-2xl border border-line bg-ink text-white"
    >
      <div className="flex items-baseline justify-between px-5 py-3.5">
        <span className="font-mono text-[11px] tracking-[0.16em] text-white/50">
          RUN #{grid.runId} — LIVE REPLAY
        </span>
        <span className="font-mono text-[11px] text-white/40">@{grid.builder}</span>
      </div>
      <div className="space-y-3 px-5 pb-4">
        <GridRow
          label={`public ${grid.publicCells.filter((c) => c.pass).length}/${grid.publicCells.length}`}
          cells={grid.publicCells}
          shown={publicShown}
          failGlyph="✕"
        />
        {grid.holdoutCells.length > 0 && (
          <GridRow
            label={
              grid.diedAtHoldout === null
                ? `hidden ${grid.holdoutCells.length}/${grid.holdoutCells.length}`
                : `hidden — died at holdout #${grid.diedAtHoldout}`
            }
            cells={grid.holdoutCells}
            shown={holdoutShown}
            failGlyph="💀"
            labelHidden={!done}
          />
        )}
      </div>
      <div
        className={`flex items-center justify-between border-t border-white/10 px-5 py-3.5 transition-opacity duration-500 ${
          done ? "opacity-100" : "opacity-0"
        }`}
      >
        <span
          className={`font-mono text-[13px] font-bold tracking-wide ${
            grid.green ? "text-[#2fbf80]" : "text-[#e05252]"
          }`}
        >
          {grid.green ? "GREEN — money moved" : "RED — nothing moved"}
        </span>
        <span className="flex items-center gap-2">
          <button
            onClick={play}
            className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-medium text-white/60 transition hover:border-white/30 hover:text-white"
          >
            ↺ replay
          </button>
          <ShareGrid text={grid.text} compact />
        </span>
      </div>
    </div>
  );
}

function GridRow({
  label,
  cells,
  shown,
  failGlyph,
  labelHidden = false,
}: {
  label: string;
  cells: { pass: boolean }[];
  shown: number;
  failGlyph: string;
  labelHidden?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex flex-wrap gap-1.5">
        {cells.map((c, i) => {
          const on = i < shown;
          return (
            <span
              key={i}
              className={`flex h-7 w-7 items-center justify-center rounded-md text-[12px] font-bold transition-all duration-300 ${
                !on
                  ? "scale-90 bg-white/10 text-transparent"
                  : c.pass
                    ? "scale-100 bg-[#2fbf80] text-ink"
                    : "scale-100 bg-[#e05252] text-white"
              }`}
            >
              {on ? (c.pass ? "✓" : failGlyph) : "·"}
            </span>
          );
        })}
      </div>
      <span
        className={`font-mono text-[11px] text-white/45 transition-opacity duration-500 ${
          labelHidden ? "opacity-0" : "opacity-100"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
