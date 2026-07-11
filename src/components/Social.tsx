"use client";

import { useTransition, useOptimistic } from "react";
import { voteAction, watchAction } from "@/lib/actions";

export function VoteControl({
  id,
  score,
  myVote,
  compact = false,
}: {
  id: number;
  score: number;
  myVote: number;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [opt, setOpt] = useOptimistic({ score, myVote });

  function cast(dir: 1 | -1) {
    const next = opt.myVote === dir ? 0 : dir;
    startTransition(async () => {
      setOpt({ score: opt.score - opt.myVote + next, myVote: next });
      await voteAction(id, next as 1 | -1 | 0);
    });
  }

  return (
    <div
      className={`flex flex-col items-center rounded-xl border border-line bg-card ${compact ? "px-1.5 py-1" : "px-2 py-1.5"}`}
    >
      <button
        aria-label="Upvote"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cast(1);
        }}
        className={`leading-none transition ${compact ? "text-[13px]" : "text-[15px]"} ${
          opt.myVote === 1 ? "text-pine" : "text-faint hover:text-ink"
        }`}
      >
        ▲
      </button>
      <span
        className={`my-0.5 font-mono font-semibold ${compact ? "text-[12px]" : "text-[13px]"} ${
          opt.myVote === 1 ? "text-pine" : opt.myVote === -1 ? "text-fail" : "text-ink-soft"
        }`}
      >
        {opt.score}
      </span>
      <button
        aria-label="Downvote"
        disabled={pending}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          cast(-1);
        }}
        className={`leading-none transition ${compact ? "text-[13px]" : "text-[15px]"} ${
          opt.myVote === -1 ? "text-fail" : "text-faint hover:text-ink"
        }`}
      >
        ▼
      </button>
    </div>
  );
}

export function WatchButton({ id, watchers, watching }: { id: number; watchers: number; watching: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(() => watchAction(id))}
      disabled={pending}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${
        watching
          ? "border-pine bg-pine-wash text-pine-deep"
          : "border-line bg-card text-ink-soft hover:border-line-strong"
      }`}
    >
      {watching ? "◉ watching" : "○ watch"}
      <span className="font-mono text-[11px] text-faint">{watchers}</span>
    </button>
  );
}
