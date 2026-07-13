"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import {
  createFriendChallengeAction,
  joinFriendChallengeAction,
  submitGuessesAction,
  type SubmitResult,
} from "@/lib/game-actions";
import type { LeaderRow, PlayItem, Source } from "@/lib/game";

export default function DetectorGame({
  day,
  items,
  signedIn,
  initialResult,
  roomId,
}: {
  day: string;
  items: PlayItem[];
  signedIn: boolean;
  initialResult: SubmitResult | null;
  roomId?: string;
}) {
  const [guesses, setGuesses] = useState<Record<number, Source>>({});
  const [result, setResult] = useState<SubmitResult | null>(initialResult);
  const [pending, startTransition] = useTransition();

  if (result) {
    return <Result day={day} signedIn={signedIn} result={result} roomId={roomId} />;
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
  roomId,
}: {
  day: string;
  signedIn: boolean;
  result: SubmitResult;
  roomId?: string;
}) {
  const { correct, total, grid, reveal, alreadyPlayed, leaderboard } = result;
  const [copied, setCopied] = useState(false);
  const [activeRoom, setActiveRoom] = useState(roomId ?? "");
  const [friendLeaderboard, setFriendLeaderboard] = useState<LeaderRow[]>([]);
  const [roomError, setRoomError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const pct = total ? Math.round((correct / total) * 100) : 0;

  useEffect(() => {
    if (!roomId) return;
    let active = true;
    joinFriendChallengeAction(roomId)
      .then((room) => {
        if (!active) return;
        if (!room) {
          setRoomError(true);
          return;
        }
        setActiveRoom(room.roomId);
        setFriendLeaderboard(room.leaderboard);
      })
      .catch(() => {
        if (active) setRoomError(true);
      });
    return () => {
      active = false;
    };
  }, [roomId]);

  async function share() {
    setSharing(true);
    setRoomError(false);
    try {
      let challengeRoom = activeRoom;
      if (!challengeRoom) {
        const room = await createFriendChallengeAction();
        challengeRoom = room.roomId;
        setActiveRoom(room.roomId);
        setFriendLeaderboard(room.leaderboard);
      }
      const url = `${window.location.origin}/play?room=${challengeRoom}`;
      const shareText = `오늘의 판별 ${day}\n${grid}  ${correct}/${total}\n나는 ${correct}개. 너는?`;
      if (navigator.share) {
        await navigator.share({ title: "오늘의 사람 vs AI 대결", text: shareText, url });
        return;
      }
      await navigator.clipboard.writeText(`${shareText}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setRoomError(true);
    } finally {
      setSharing(false);
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
            disabled={sharing}
            className="rounded-lg bg-pine px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-pine-deep"
          >
            {sharing ? "도전장 만드는 중…" : copied ? "도전 링크 복사됨 ✓" : activeRoom ? "다음 친구 지목" : "친구에게 도전"}
          </button>
          <Link
            href="/"
            className="rounded-lg border border-line bg-card px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-line-strong"
          >
            poolproof 보기
          </Link>
        </div>
      </div>

      {(activeRoom || roomError) && (
        <section className="mt-3 overflow-hidden rounded-2xl border border-pine/25 bg-card">
          <div className="flex items-center justify-between border-b border-line bg-pine-wash px-4 py-3">
            <div>
              <h2 className="text-[13.5px] font-semibold text-ink">친구 대결 순위</h2>
              <p className="mt-0.5 text-[11.5px] text-muted">같은 링크로 들어온 친구끼리 비교합니다.</p>
            </div>
            <span className="font-mono text-[11px] text-pine-deep">{friendLeaderboard.length}명</span>
          </div>
          {roomError ? (
            <p className="px-4 py-5 text-center text-[12.5px] text-fail">
              이 도전장은 만료됐거나 불러올 수 없어요. 새 도전장을 만들어주세요.
            </p>
          ) : friendLeaderboard.length === 0 ? (
            <p className="px-4 py-5 text-center text-[12.5px] text-muted">순위를 불러오는 중…</p>
          ) : (
            friendLeaderboard.map((row, index) => (
              <div
                key={`${row.display}-${index}`}
                className={`flex items-center gap-3 px-4 py-2.5 text-[13px] ${index > 0 ? "border-t border-line" : ""}`}
              >
                <span className="w-6 font-mono text-[12px] font-semibold text-faint">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{row.display}</span>
                <span className="hidden tracking-[0.06em] sm:inline">{row.grid}</span>
                <span className="font-mono text-[12.5px] font-bold text-pine">{row.correct}/{row.total}</span>
              </div>
            ))
          )}
        </section>
      )}

      <Link
        href="/play/submit"
        className="mt-3 flex items-center gap-3 rounded-xl border border-pine/25 bg-pine-wash px-4 py-3 transition hover:border-pine/45"
      >
        <span className="text-[20px]">✍️</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-ink">직접 문제 내기</span>
          <span className="block text-[12px] text-ink-soft">
            내가 쓴 글이 &lsquo;사람 답&rsquo;이 되어 다른 사람에게 출제돼요.
          </span>
        </span>
        <span className="shrink-0 text-[13px] font-semibold text-pine-deep">→</span>
      </Link>

      {!signedIn && (
        <Link
          href="/login?next=/play"
          className="mt-2.5 block rounded-xl border border-dashed border-line-strong bg-card px-4 py-3 text-center text-[13px] text-muted transition hover:text-ink"
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
                  {isHuman
                    ? `🙋 사람${r.author ? ` · @${r.author}` : ""}`
                    : `🤖 AI${r.model && r.model !== "bank" ? ` · ${r.model}` : ""}`}
                </span>
                {known && (
                  <span className={`text-[11.5px] font-semibold ${r.ok ? "text-pine" : "text-fail"}`}>
                    {r.ok ? "정답" : `오답 (당신: ${r.guess === "human" ? "사람" : "AI"})`}
                  </span>
                )}
                <span className="ml-auto text-[10.5px] text-faint">{r.domain}</span>
              </div>
              {r.prompt && (
                <p className="mt-2 text-[11.5px] leading-relaxed text-faint">주제: {r.prompt}</p>
              )}
              <p className="mt-1.5 line-clamp-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
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
