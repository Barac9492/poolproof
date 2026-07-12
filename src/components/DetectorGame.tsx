"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { submitGuessesAction, type SubmitResult } from "@/lib/game-actions";
import type { PlayItem, Source } from "@/lib/game";

export default function DetectorGame({
  day,
  items,
  signedIn,
  initialResult,
}: {
  day: string;
  items: PlayItem[];
  signedIn: boolean;
  initialResult: SubmitResult | null;
}) {
  const [guesses, setGuesses] = useState<Record<number, Source>>({});
  const [result, setResult] = useState<SubmitResult | null>(initialResult);
  const [pending, startTransition] = useTransition();

  if (result) {
    return <Result day={day} signedIn={signedIn} result={result} />;
  }

  const answered = Object.keys(guesses).length;
  const allAnswered = answered === items.length;

  function submit() {
    if (!allAnswered || pending) return;
    startTransition(async () => {
      const r = await submitGuessesAction(guesses);
      setResult(r);
    });
  }

  return (
    <div>
      <ol className="space-y-3">
        {items.map((it, i) => {
          const g = guesses[it.id];
          return (
            <li key={it.id} className="rounded-2xl border border-line bg-card p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="rounded-full border border-line bg-paper-deep/50 px-2 py-0.5 text-[10.5px] font-medium text-muted">
                  {it.domain}
                </span>
              </div>
              <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                {it.body}
              </p>
              <div className="mt-3.5 grid grid-cols-2 gap-2">
                <Choice active={g === "human"} onClick={() => setGuesses((p) => ({ ...p, [it.id]: "human" }))}>
                  🙋 사람
                </Choice>
                <Choice active={g === "ai"} onClick={() => setGuesses((p) => ({ ...p, [it.id]: "ai" }))}>
                  🤖 AI
                </Choice>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="sticky bottom-4 z-10 mt-5">
        <button
          onClick={submit}
          disabled={!allAnswered || pending}
          className={`w-full rounded-xl px-5 py-3.5 text-[15px] font-semibold shadow-sm transition ${
            allAnswered && !pending
              ? "bg-pine text-white hover:bg-pine-deep"
              : "cursor-not-allowed bg-line-strong text-white/80"
          }`}
        >
          {pending ? "채점 중…" : allAnswered ? "제출하고 채점 보기" : `${answered} / ${items.length} 선택됨`}
        </button>
      </div>
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl border px-3 py-2.5 text-[14px] font-semibold transition ${
        active
          ? "border-pine bg-pine-wash text-pine-deep"
          : "border-line bg-card text-ink-soft hover:border-line-strong"
      }`}
    >
      {children}
    </button>
  );
}

function Result({
  day,
  signedIn,
  result,
}: {
  day: string;
  signedIn: boolean;
  result: SubmitResult;
}) {
  const { correct, total, grid, reveal, alreadyPlayed, leaderboard } = result;
  const [copied, setCopied] = useState(false);
  const pct = total ? Math.round((correct / total) * 100) : 0;

  const shareText = `오늘의 판별 ${day}\n${grid}  ${correct}/${total}\n사람일까 AI일까 → poolproof.dev/play`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ text: shareText });
        return;
      }
    } catch {
      /* fall through to clipboard */
    }
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  return (
    <div>
      <div className="rounded-2xl border border-pine/25 bg-pine-wash p-6 text-center">
        {alreadyPlayed && (
          <p className="mb-2 font-mono text-[11px] tracking-[0.14em] text-muted">오늘은 이미 플레이함</p>
        )}
        <div className="font-mono text-[13px] font-medium text-pine-deep">오늘의 점수</div>
        <div className="mt-1 text-[52px] font-bold leading-none tracking-tight text-ink">
          {correct}
          <span className="text-[28px] text-muted"> / {total}</span>
        </div>
        <div className="mt-3 text-[22px] leading-none tracking-[0.08em]">{grid}</div>
        <p className="mt-3 text-[13.5px] text-ink-soft">
          {pct >= 80
            ? "AI 냄새 잘 맡네요. 리더보드 상단 노려봐요."
            : pct >= 50
              ? "절반은 넘겼어요. 내일 다시 도전!"
              : "생각보다 어렵죠? AI는 점점 사람처럼 씁니다."}
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            onClick={share}
            className="rounded-lg bg-pine px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-pine-deep"
          >
            {copied ? "복사됨 ✓" : "결과 공유"}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-line bg-card px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-line-strong"
          >
            poolproof 보기
          </Link>
        </div>
      </div>

      {!signedIn && (
        <Link
          href="/login?next=/play"
          className="mt-3 block rounded-xl border border-dashed border-line-strong bg-card px-4 py-3 text-center text-[13px] text-muted transition hover:text-ink"
        >
          로그인하면 리더보드에 <span className="font-semibold text-ink">이름</span>이 올라가요 →
        </Link>
      )}

      <h2 className="mt-8 font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
        정답과 해설
      </h2>
      <ol className="mt-3 space-y-2.5">
        {reveal.map((r, i) => {
          const known = r.guess !== null;
          const isHuman = r.source === "human";
          return (
            <li
              key={r.id}
              className={`rounded-2xl border p-4 ${
                known ? (r.ok ? "border-pine/30 bg-pine-wash" : "border-fail/30 bg-fail-soft") : "border-line bg-card"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[11px] font-semibold text-faint">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${
                    isHuman ? "bg-ink text-white" : "bg-pine text-white"
                  }`}
                >
                  {isHuman ? "🙋 사람" : `🤖 AI${r.model ? ` · ${r.model}` : ""}`}
                </span>
                {known && (
                  <span className={`text-[11.5px] font-semibold ${r.ok ? "text-pine" : "text-fail"}`}>
                    {r.ok ? "정답" : `오답 (당신: ${r.guess === "human" ? "사람" : "AI"})`}
                  </span>
                )}
                <span className="ml-auto text-[10.5px] text-faint">{r.domain}</span>
              </div>
              <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                {r.body}
              </p>
              {r.note && <p className="mt-2 text-[12.5px] leading-relaxed text-muted">→ {r.note}</p>}
            </li>
          );
        })}
      </ol>

      <h2 className="mt-8 font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
        오늘의 리더보드
      </h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-card">
        {leaderboard.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-muted">아직 아무도 없어요 — 첫 기록의 주인공!</p>
        ) : (
          leaderboard.map((row, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 px-4 py-2.5 text-[13px] ${
                i > 0 ? "border-t border-line" : ""
              }`}
            >
              <span className="w-6 font-mono text-[12px] font-semibold text-faint">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate font-medium text-ink">{row.display}</span>
              <span className="hidden tracking-[0.06em] sm:inline">{row.grid}</span>
              <span className="font-mono text-[12.5px] font-bold text-pine">
                {row.correct}/{row.total}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
