"use client";

import { useEffect, useRef, useState } from "react";
import { submitOneShotAction, type OneShotActionResult } from "@/lib/oneshot-actions";

// The one-shot console: prompt in → REAL verdict out, revealed with the same
// cadence as the hero demo (public cascade fast, holdout one held breath at a
// time). This is LiveVerdict wired to an actual generation + execution.

interface Task {
  slug: string;
  title: string;
  oneLiner: string;
}

type Phase = "idle" | "working" | "reveal-public" | "reveal-holdout" | "verdict";

const WORKING_LINES = [
  "프롬프트를 모델에 전달하는 중…",
  "모델이 코드를 쓰는 중… (수정 기회 없음)",
  "생성된 코드를 그대로 실행하는 중…",
  "숨은 테스트 채점 중…",
];

export default function OneShotConsole({ tasks, liveEnabled }: { tasks: Task[]; liveEnabled: boolean }) {
  const [slug, setSlug] = useState(tasks[0]?.slug ?? "");
  const [prompt, setPrompt] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [workingLine, setWorkingLine] = useState(0);
  const [result, setResult] = useState<OneShotActionResult | null>(null);
  const [publicShown, setPublicShown] = useState(0);
  const [holdoutShown, setHoldoutShown] = useState(0);
  const [copied, setCopied] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const task = tasks.find((t) => t.slug === slug);
  const v = result?.verdict;

  function at(ms: number, fn: () => void) {
    timers.current.push(setTimeout(fn, ms));
  }

  async function fire() {
    if (phase === "working" || !task) return;
    setPhase("working");
    setResult(null);
    setPublicShown(0);
    setHoldoutShown(0);
    setWorkingLine(0);
    const lineTimer = setInterval(() => setWorkingLine((n) => Math.min(n + 1, WORKING_LINES.length - 1)), 3500);

    const res = await submitOneShotAction(slug, prompt);
    clearInterval(lineTimer);
    setResult(res);

    if (!res.ok || !res.verdict) {
      setPhase("verdict");
      return;
    }

    // Real cells arrived — now the reveal. Public fast, holdout slow.
    const pub = res.verdict.publicCells;
    const hold = res.verdict.holdoutCells;
    const holdStop = res.verdict.diedAt === null ? hold.length : res.verdict.diedAt;
    setPhase("reveal-public");
    pub.forEach((_, i) => at(250 + i * 200, () => setPublicShown(i + 1)));
    const afterPub = 250 + pub.length * 200;
    at(afterPub + 700, () => setPhase("reveal-holdout"));
    for (let j = 0; j < holdStop; j++) {
      at(afterPub + 1000 + j * 620, () => setHoldoutShown(j + 1));
    }
    at(afterPub + 1000 + holdStop * 620 + 400, () => setPhase("verdict"));
  }

  const shareText =
    v && task
      ? `원샷 챌린지 · ${task.title}\n${v.publicCells.map((p) => (p ? "🟩" : "🟥")).join("")}  public\n${v.holdoutCells
          .slice(0, v.diedAt ?? v.holdoutCells.length)
          .map((p) => (p ? "🟩" : "💀"))
          .join("")}  holdout\n${v.green ? "원샷에 통과 ✓" : `홀드아웃 #${v.diedAt}에서 사망`}\n프롬프트 1개, 실행 1번 → poolproof.dev/oneshot`
      : "";

  async function share() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  const running = phase === "working" || phase === "reveal-public" || phase === "reveal-holdout";

  return (
    <div className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      {/* task picker */}
      <div className="flex flex-wrap gap-2">
        {tasks.map((t) => (
          <button
            key={t.slug}
            onClick={() => {
              if (!running) {
                setSlug(t.slug);
                setResult(null);
                setPhase("idle");
              }
            }}
            className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition ${
              t.slug === slug
                ? "border-pine bg-pine-wash text-pine-deep"
                : "border-line bg-card text-ink-soft hover:border-line-strong"
            }`}
          >
            {t.title}
          </button>
        ))}
      </div>
      {task && <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">{task.oneLiner}</p>}

      {/* prompt */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        disabled={running}
        maxLength={500}
        rows={4}
        placeholder="모델에게 줄 프롬프트 한 개. 이게 당신의 유일한 무기입니다 — 엣지케이스를 얼마나 짚어주느냐가 실력. (수정 기회 없음)"
        className="mt-4 w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-3 text-[14px] leading-relaxed text-ink placeholder:text-faint focus:border-pine focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between">
        <span className="font-mono text-[11px] text-faint">{prompt.length}/500</span>
        <span className="font-mono text-[11px] text-faint">과제당 하루 1회</span>
      </div>

      <button
        onClick={fire}
        disabled={running || prompt.trim().length < 4}
        className={`mt-3 w-full rounded-xl px-5 py-3.5 text-[15px] font-semibold shadow-sm transition ${
          !running && prompt.trim().length >= 4
            ? "bg-pine text-white hover:bg-pine-deep"
            : "cursor-not-allowed bg-line-strong text-white/80"
        }`}
      >
        {phase === "working" ? WORKING_LINES[workingLine] : running ? "판정 중…" : "원샷 발사 →"}
      </button>

      {!liveEnabled && (
        <p className="mt-3 rounded-xl border border-dashed border-line-strong bg-paper-deep/40 px-4 py-3 text-center text-[12.5px] text-muted">
          라이브 모델이 아직 연결되지 않았습니다 — <span className="font-mono">ANTHROPIC_API_KEY</span> 설정
          시 활성화됩니다.
        </p>
      )}

      {/* errors */}
      {result && !result.ok && result.error !== undefined && phase === "verdict" && (
        <p className="mt-4 rounded-xl border border-fail/30 bg-fail-soft px-4 py-3 text-[13px] text-ink-soft">
          {result.error === "daily-limit" && "오늘 이 과제는 이미 발사했습니다. 내일 다시 — 그게 원샷입니다."}
          {result.error === "live-disabled" && "라이브 모델 미연결 상태입니다."}
          {result.error === "prompt-too-short" && "프롬프트가 너무 짧습니다."}
          {result.error === "unknown-task" && "알 수 없는 과제입니다."}
          {result.error === "failed" && "실행에 실패했습니다. 잠시 후 다시 시도해주세요."}
        </p>
      )}

      {/* the reveal — real cells */}
      {v && phase !== "working" && (
        <div className="mt-5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">공개 테스트</span>
            {publicShown === v.publicCells.length && (
              <span className="font-mono text-[11px] font-semibold text-pine">
                {v.publicCells.filter(Boolean).length}/{v.publicCells.length}
              </span>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {v.publicCells.map((pass, i) => (
              <span key={i} className={`text-[19px] leading-none ${i < publicShown ? "pp-pop" : "opacity-0"}`}>
                {pass ? "🟩" : "🟥"}
              </span>
            ))}
          </div>

          <div
            className={`mt-4 transition-all duration-500 ${
              phase === "reveal-holdout" || phase === "verdict" ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="font-mono text-[11px] font-semibold text-ink">숨은 테스트 · 모델은 못 봤다</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {v.holdoutCells.map((pass, i) => {
                const shown = i < holdoutShown;
                const isDeath = v.diedAt !== null && i === v.diedAt - 1;
                return (
                  <span
                    key={i}
                    className={`text-[19px] leading-none ${shown ? (isDeath ? "pp-die" : "pp-pop") : "opacity-25"}`}
                  >
                    {!shown ? "⬜" : pass ? "🟩" : "💀"}
                  </span>
                );
              })}
            </div>
          </div>

          {phase === "verdict" && (
            <div className="mt-4">
              {v.green ? (
                <div className="pp-glow rounded-xl border border-pine/30 bg-pine-wash px-4 py-3.5">
                  <p className="text-[14px] font-bold text-pine-deep">원샷에 통과 — 숨은 테스트까지 전부.</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">
                    이 프롬프트는 아래 기록에 공개 박제됩니다. 그게 보상입니다.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-fail/30 bg-fail-soft px-4 py-3.5">
                  <p className="text-[14px] font-bold text-fail">
                    {v.diedAt !== null ? `홀드아웃 #${v.diedAt}에서 사망` : "공개 테스트에서 사망"} — 원샷 실패
                  </p>
                  {v.detail && <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{v.detail}</p>}
                  <p className="mt-1 text-[12.5px] text-muted">수정 기회는 없습니다. 내일 새 프롬프트로.</p>
                </div>
              )}
              <button
                onClick={share}
                className="mt-3 rounded-lg bg-pine px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-pine-deep"
              >
                {copied ? "복사됨 ✓" : "결과 공유"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
