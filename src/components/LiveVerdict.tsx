"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ONESHOT_GREEN_REWARD } from "@/lib/economy";

// The tension core, made visible. A bounty submission doesn't resolve in a
// flat instant — it *reveals*. Public tests cascade green (confidence rising),
// then the holdout — which the builder never saw — opens one square at a time.
// It either survives to a payout or dies on a hidden trap. The suspense is
// real: nobody in the room knows what the holdout checks. Same drama as a slot
// pull, except it's earned by real engineering, not luck.
//
// Scenarios below use retired illustrative josa cases. The active private
// holdout suite is rotated and never bundled into client or repository code.

type Cell = { label: string; pass: boolean };

interface Scenario {
  key: "die" | "green";
  submissionNote: string;
  publicCells: Cell[];
  holdoutCells: Cell[];
  /** holdout index the run dies at (0-based), or null if it survives */
  diesAt: number | null;
}

const PUBLIC: Cell[] = [
  { label: "은/는 · 책 → 책은", pass: true },
  { label: "은/는 · 나무 → 나무는", pass: true },
  { label: "이/가 · 철수 → 철수가", pass: true },
  { label: "을/를 · 밥 → 밥을", pass: true },
  { label: "과/와 · 바다 → 바다와", pass: true },
  { label: "아/야 · 영희 → 영희야", pass: true },
];

const HOLDOUT_BASE: Cell[] = [
  { label: "(으)로 · 회사 → 회사로", pass: true },
  { label: "(으)로 · 부산 → 부산으로", pass: true },
  { label: "(으)로 · 서울 → 서울로 (ㄹ받침 예외)", pass: true },
  { label: "비한글 · GitHub → GitHub가", pass: true },
  { label: "ㄹ받침 은/는 · 서울 → 서울은", pass: true },
];

const SCENARIOS: Record<"die" | "green", Scenario> = {
  die: {
    key: "die",
    submissionNote: "받침 유/무만 토글하는 순진한 제출",
    publicCells: PUBLIC,
    holdoutCells: HOLDOUT_BASE.map((c, i) =>
      i === 2 ? { ...c, pass: false, label: "(으)로 · 서울 → 서울으로 ✗ (정답: 서울로)" } : c
    ),
    diesAt: 2,
  },
  green: {
    key: "green",
    submissionNote: "ㄹ받침 예외까지 처리한 제출",
    publicCells: PUBLIC,
    holdoutCells: HOLDOUT_BASE,
    diesAt: null,
  },
};

type Phase = "running" | "public-done" | "holdout" | "verdict";

export default function LiveVerdict() {
  const [scenarioKey, setScenarioKey] = useState<"die" | "green">("die");
  const [runId, setRunId] = useState(0);
  const [phase, setPhase] = useState<Phase>("running");
  const [publicShown, setPublicShown] = useState(0);
  const [holdoutShown, setHoldoutShown] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const sc = SCENARIOS[scenarioKey];
  const holdoutStop = sc.diesAt === null ? sc.holdoutCells.length : sc.diesAt + 1;

  const play = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const at = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

    // reset on the next tick (not synchronously) so the effect body stays free
    // of direct setState — the 0ms delay is imperceptible
    at(0, () => {
      setPhase("running");
      setPublicShown(0);
      setHoldoutShown(0);
    });

    // public cascade — fast, momentum building
    PUBLIC.forEach((_, i) => at(350 + i * 210, () => setPublicShown(i + 1)));
    const afterPublic = 350 + PUBLIC.length * 210;
    at(afterPublic + 350, () => setPhase("public-done"));
    at(afterPublic + 950, () => setPhase("holdout"));

    // holdout — slow, each hidden square is a held breath
    const hStart = afterPublic + 1250;
    for (let j = 0; j < holdoutStop; j++) {
      at(hStart + j * 560, () => setHoldoutShown(j + 1));
    }
    at(hStart + holdoutStop * 560 + 350, () => setPhase("verdict"));
  }, [holdoutStop]);

  useEffect(() => {
    play();
    return () => timers.current.forEach(clearTimeout);
    // re-run whenever scenario or manual replay changes
  }, [play, runId, scenarioKey]);

  const died = sc.diesAt !== null;

  return (
    <div className="w-full max-w-sm lg:shrink-0">
      <div
        className={`rounded-2xl border bg-card p-5 shadow-sm transition-colors ${
          phase === "verdict"
            ? died
              ? "border-fail/40"
              : "border-pine/45"
            : "border-line"
        } ${phase === "verdict" && !died ? "pp-glow" : ""}`}
      >
        {/* header */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            {phase !== "verdict" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-pine/60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                phase === "verdict" ? (died ? "bg-fail" : "bg-pine") : "bg-pine"
              }`}
            />
          </span>
          <span className="font-mono text-[11px] font-semibold text-faint">
            {phase === "verdict" ? "판정 완료" : "AI 제출 실행 중…"}
          </span>
          <span className="ml-auto rounded-full border border-line bg-paper-deep/50 px-2 py-0.5 text-[10.5px] font-medium text-muted">
            josa · 조사 자동선택
          </span>
        </div>

        {/* public row */}
        <div className="mt-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] text-muted">공개 테스트</span>
            <span
              className={`font-mono text-[11px] font-semibold transition-opacity ${
                publicShown === PUBLIC.length ? "text-pine opacity-100" : "opacity-0"
              }`}
            >
              {PUBLIC.length}/{PUBLIC.length} 통과 ✓
            </span>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {PUBLIC.map((_, i) => (
              <span
                key={i}
                className={`text-[19px] leading-none ${i < publicShown ? "pp-pop" : "opacity-0"}`}
              >
                🟩
              </span>
            ))}
          </div>
        </div>

        {/* holdout row */}
        <div
          className={`mt-4 transition-all duration-500 ${
            phase === "holdout" || phase === "verdict"
              ? "max-h-40 opacity-100"
              : "max-h-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-semibold text-ink">
              숨은 테스트 · AI는 못 봤다
            </span>
            <span className="font-mono text-[10px] text-faint">holdout</span>
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {sc.holdoutCells.map((c, i) => {
              const shown = i < holdoutShown;
              const isDeath = died && i === sc.diesAt;
              return (
                <span
                  key={i}
                  className={`text-[19px] leading-none ${
                    shown ? (isDeath ? "pp-die" : "pp-pop") : "opacity-25"
                  }`}
                >
                  {!shown ? "⬜" : c.pass ? "🟩" : "💀"}
                </span>
              );
            })}
          </div>
        </div>

        {/* verdict */}
        <div
          className={`mt-4 transition-all duration-500 ${
            phase === "verdict" ? "opacity-100" : "max-h-0 overflow-hidden opacity-0"
          }`}
        >
          {died ? (
            <div className="rounded-xl border border-fail/30 bg-fail-soft px-3.5 py-3">
              <p className="text-[13px] font-bold text-fail">
                홀드아웃 #{(sc.diesAt ?? 0) + 1}에서 사망 — 바운티 미지급
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                서울 + (으)로 → &lsquo;서울<span className="font-bold text-fail">으</span>로&rsquo;.
                받침만 보면 죽습니다. 공개 테스트는 다 통과했죠 —{" "}
                <span className="font-semibold text-ink">그게 &lsquo;되는 척&rsquo;</span>.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-pine/30 bg-pine-wash px-3.5 py-3">
              <p className="text-[13px] font-bold text-pine-deep">
                홀드아웃까지 전부 통과 — 바운티 지급 <span className="text-pine">+{ONESHOT_GREEN_REWARD} 크레딧</span>
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
                봐주기가 아니라 숨은 테스트가 인정한 &lsquo;진짜&rsquo;. 이 제출은
                영구 전적에 green으로 박제됩니다.
              </p>
            </div>
          )}
        </div>

        {/* controls */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => setRunId((n) => n + 1)}
            className="rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-ink transition hover:border-line-strong"
          >
            ↻ 다시 보기
          </button>
          <button
            onClick={() => setScenarioKey((k) => (k === "die" ? "green" : "die"))}
            className="rounded-lg border border-line bg-card px-3 py-1.5 text-[12px] font-semibold text-ink-soft transition hover:border-pine hover:text-pine-deep"
          >
            {scenarioKey === "die" ? "통과하는 제출 보기 →" : "실패하는 제출 보기 →"}
          </button>
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[11px] text-faint">
        ↑ &lsquo;됐다&rsquo; 싶은 순간, 숨은 테스트가 열립니다
      </p>
    </div>
  );
}
