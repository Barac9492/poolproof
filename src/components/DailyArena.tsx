"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { track } from "@vercel/analytics/react";
import { MessageResponse } from "@/components/ai-elements/message";
import { chooseBattleAction } from "@/lib/battle-actions";
import {
  createChallengeRoomAction,
  submitChallengeScoreAction,
} from "@/lib/daily-game-actions";
import type { PublicBattle } from "@/lib/battles";

type Choice = "A" | "B";
type Answer = {
  choice: Choice;
  correct: boolean;
  category: string;
  model: string;
};
type DailyState = { answers: Record<string, Answer>; finished: boolean };
type LeaderboardEntry = { name: string; score: number; total: number; pattern: string };

const EMPTY: DailyState = { answers: {}, finished: false };
const subscribeToHydration = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

function isHuman(model: string) {
  return model === "원문" || model === "사람" || model === "사람 작성 확인";
}

function readDailyState(key: string): DailyState {
  try {
    const value = localStorage.getItem(key);
    return value ? { ...EMPTY, ...JSON.parse(value) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function resultTitle(score: number, total: number) {
  const ratio = score / total;
  if (ratio === 1) return "사람 냄새 만렙";
  if (ratio >= 2 / 3) return "AI 냄새 사냥꾼";
  if (ratio >= 1 / 3) return "반은 사람, 반은 프롬프트";
  return "AI에게 제대로 속았습니다";
}

export default function DailyArena({
  battles,
  dayKey,
  roomId: inboundRoomId,
}: {
  battles: PublicBattle[];
  dayKey: string;
  roomId?: string;
}) {
  const storageKey = `poolproof-daily-${dayKey}`;
  const hydrated = useSyncExternalStore(subscribeToHydration, clientSnapshot, serverSnapshot);

  if (!hydrated) return <div className="arena-loading" aria-label="오늘의 판별 불러오는 중" />;

  return (
    <HydratedDailyArena
      battles={battles}
      dayKey={dayKey}
      roomId={inboundRoomId}
      storageKey={storageKey}
      initialDaily={readDailyState(storageKey)}
      initialDisplayName={localStorage.getItem("poolproof-player-name") ?? ""}
    />
  );
}

function HydratedDailyArena({
  battles,
  dayKey,
  roomId: inboundRoomId,
  storageKey,
  initialDaily,
  initialDisplayName,
}: {
  battles: PublicBattle[];
  dayKey: string;
  roomId?: string;
  storageKey: string;
  initialDaily: DailyState;
  initialDisplayName: string;
}) {
  const answeredOnLoad = battles.filter((battle) => initialDaily.answers[battle.id]).length;
  const [daily, setDaily] = useState<DailyState>(initialDaily);
  const [index, setIndex] = useState(Math.min(answeredOnLoad, battles.length - 1));
  const [choice, setChoice] = useState<Choice | null>(null);
  const [counts, setCounts] = useState<{ a: number; b: number } | null>(null);
  const [revealed, setRevealed] = useState<{ modelA: string; modelB: string } | null>(null);
  const [showSummary, setShowSummary] = useState(initialDaily.finished || answeredOnLoad >= battles.length);
  const [voteError, setVoteError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [roomId, setRoomId] = useState(inboundRoomId ?? "");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [roomError, setRoomError] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const orderedAnswers = useMemo(
    () => battles.map((battle) => daily.answers[battle.id]).filter(Boolean),
    [battles, daily.answers]
  );
  const score = orderedAnswers.filter((answer) => answer.correct).length;
  const pattern = orderedAnswers.map((answer) => (answer.correct ? "🟩" : "🟥")).join("");
  const weakCategory = orderedAnswers.find((answer) => !answer.correct)?.category ?? "없음";
  const battle = battles[index];
  const totalVotes = counts ? counts.a + counts.b : battle.seedA + battle.seedB;
  const pctA = totalVotes > 0 ? Math.round(((counts?.a ?? battle.seedA) / totalVotes) * 100) : 50;
  const selectedModel = choice === "A" ? revealed?.modelA : revealed?.modelB;
  const currentCorrect = selectedModel ? isHuman(selectedModel) : null;
  const isLast = index === battles.length - 1;

  function persist(next: DailyState) {
    setDaily(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  }

  function choose(nextChoice: Choice) {
    if (choice || isPending) return;
    setChoice(nextChoice);
    setVoteError(false);
    startTransition(async () => {
      try {
        const result = await chooseBattleAction(battle.id, nextChoice);
        const chosenModel = nextChoice === "A" ? result.modelA : result.modelB;
        const next = {
          ...daily,
          answers: {
            ...daily.answers,
            [battle.id]: {
              choice: nextChoice,
              correct: isHuman(chosenModel),
              category: battle.category,
              model: chosenModel,
            },
          },
        };
        setCounts(result);
        setRevealed({ modelA: result.modelA, modelB: result.modelB });
        persist(next);
        track("daily_answered", {
          day: dayKey,
          question: index + 1,
          correct: isHuman(chosenModel),
        });
      } catch {
        setChoice(null);
        setVoteError(true);
      }
    });
  }

  function advance() {
    if (isLast) {
      const next = { ...daily, finished: true };
      persist(next);
      setShowSummary(true);
      track("daily_completed", { day: dayKey, score, total: battles.length });
      return;
    }
    setIndex((value) => value + 1);
    setChoice(null);
    setCounts(null);
    setRevealed(null);
    setVoteError(false);
  }

  function scoreInput(targetRoom?: string) {
    return {
      roomId: targetRoom,
      displayName,
      score,
      total: battles.length,
      pattern,
    };
  }

  async function saveToRoom(targetRoom: string) {
    const result = await submitChallengeScoreAction({ ...scoreInput(targetRoom), roomId: targetRoom });
    setLeaderboard(result.leaderboard);
    return result;
  }

  useEffect(() => {
    if (!showSummary || !inboundRoomId || pattern.length === 0) return;
    let active = true;
    submitChallengeScoreAction({ ...scoreInput(inboundRoomId), roomId: inboundRoomId })
      .then((result) => {
        if (active) setLeaderboard(result.leaderboard);
      })
      .catch(() => {
        if (active) setRoomError(true);
      });
    return () => {
      active = false;
    };
    // The inbound score is submitted once when the completed result first opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inboundRoomId, pattern, showSummary]);

  async function shareChallenge() {
    setRoomError(false);
    setCopied(false);
    setSharing(true);
    try {
      let activeRoom = roomId;
      if (!activeRoom) {
        const created = await createChallengeRoomAction(scoreInput());
        activeRoom = created.roomId;
        setRoomId(activeRoom);
        setLeaderboard(created.leaderboard);
      } else {
        await saveToRoom(activeRoom);
      }
      if (displayName.trim()) localStorage.setItem("poolproof-player-name", displayName.trim());
      const url = `${window.location.origin}/?room=${activeRoom}#play`;
      const text = score / battles.length >= 2 / 3
        ? `오늘 사람 vs AI ${score}/${battles.length}. 나보다 잘 맞힐 수 있어?\n${pattern}`
        : `나는 AI에게 ${battles.length - score}번 속았습니다. 너도 한번 해봐.\n${pattern}`;
      if (navigator.share) {
        await navigator.share({ title: "오늘의 사람 vs AI 대결", text, url });
      } else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
      }
      track("daily_challenge_shared", { day: dayKey, score, room: activeRoom });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setRoomError(true);
    } finally {
      setSharing(false);
    }
  }

  function updateName() {
    if (!roomId) return;
    startTransition(async () => {
      try {
        localStorage.setItem("poolproof-player-name", displayName.trim());
        await saveToRoom(roomId);
        setRoomError(false);
      } catch {
        setRoomError(true);
      }
    });
  }

  function restart() {
    localStorage.removeItem(storageKey);
    setDaily(EMPTY);
    setIndex(0);
    setChoice(null);
    setCounts(null);
    setRevealed(null);
    setShowSummary(false);
    setLeaderboard([]);
  }

  if (showSummary) {
    return (
      <section className="daily-result" aria-labelledby="daily-result-title">
        <p className="result-kicker">오늘의 판별 완료</p>
        <div className="result-score"><strong>{score}</strong><span>/{battles.length}</span></div>
        <h2 id="daily-result-title">{resultTitle(score, battles.length)}</h2>
        <div className="result-grid" aria-label={`${score}개 정답`}>{pattern}</div>
        <p className="result-detail">
          {weakCategory === "없음" ? "오늘은 모든 분야에서 사람의 글을 골랐어요." : `${weakCategory} 문장에서 AI에게 가장 먼저 속았어요.`}
        </p>

        <div className="challenge-maker">
          <div>
            <span>{roomId ? "단톡방 대결 진행 중" : "친구에게 도전장 보내기"}</span>
            <strong>{roomId ? "같은 문제를 푼 친구들과 순위를 비교하세요." : `“나는 ${score}개. 너는?” 한마디면 충분해요.`}</strong>
          </div>
          <div className="challenge-controls">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={16}
              placeholder="별명 (선택)"
              aria-label="리더보드 별명"
            />
            {roomId && <button type="button" onClick={updateName} disabled={isPending}>이름 저장</button>}
          </div>
          <button className="challenge-share" type="button" onClick={shareChallenge} disabled={isPending || sharing}>
            {sharing ? "도전장 만드는 중…" : copied ? "도전 링크 복사됨" : roomId ? "다음 친구 지목하기" : "단톡방 대결 만들기"}<span>↗</span>
          </button>
          {roomError && <p className="challenge-error">대결방을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>}
        </div>

        {leaderboard.length > 0 && (
          <div className="leaderboard">
            <header><span>단톡방 순위</span><b>{leaderboard.length}명 참여</b></header>
            <ol>
              {leaderboard.map((entry, rank) => (
                <li key={`${entry.name}-${rank}`}>
                  <span>{rank + 1}</span>
                  <strong>{entry.name}</strong>
                  <em>{entry.pattern}</em>
                  <b>{entry.score}/{entry.total}</b>
                </li>
              ))}
            </ol>
          </div>
        )}

        <button className="result-restart" type="button" onClick={restart}>베타 세트 다시 풀기</button>
      </section>
    );
  }

  return (
    <div className="daily-arena">
      <div className="daily-progress">
        <div>
          <span>{inboundRoomId ? "친구가 보낸 대결" : `오늘의 판별 · ${dayKey}`}</span>
          <b>{index + 1}/{battles.length}</b>
        </div>
        <div className="daily-progress-bar"><span style={{ width: `${((index + (choice ? 1 : 0)) / battles.length) * 100}%` }} /></div>
      </div>

      <section className="battle-stage" data-testid="daily-battle-stage">
        <header className="battle-prompt">
          <div><span>{battle.category}</span><span>·</span><span>사람 vs AI</span></div>
          <h2>{battle.prompt}</h2>
          <p>사람이 직접 쓴 문장을 하나 고르세요.</p>
        </header>
        <div className="answer-grid">
          {(["A", "B"] as const).map((option) => (
            <button
              type="button"
              key={option}
              className={`answer-card ${choice === option ? "selected" : ""} ${choice && choice !== option ? "muted" : ""}`}
              onClick={() => choose(option)}
              aria-label={`${option} 문장 선택`}
            >
              <span className="answer-label">{option}</span>
              <span className="answer-text"><MessageResponse>{option === "A" ? battle.optionA.text : battle.optionB.text}</MessageResponse></span>
              <span className="pick-hint">사람이 쓴 것 같아요 <b>↗</b></span>
            </button>
          ))}
        </div>
        {!choice ? (
          <p className={`stage-footnote ${voteError ? "error" : ""}`}>
            {voteError ? "선택을 기록하지 못했어요. 다시 눌러주세요." : "출처는 선택한 뒤에만 공개됩니다."}
          </p>
        ) : (
          <div className={`reveal-panel ${currentCorrect === false ? "wrong" : ""}`}>
            <div className="reveal-kicker">{currentCorrect == null ? "정답 확인 중" : currentCorrect ? "정답입니다" : "AI에게 속았습니다"}</div>
            <h3><span>{choice}</span>의 정체는 <strong>{selectedModel ?? "확인 중"}</strong></h3>
            <div className="model-reveal">
              <div><span>A</span><b>{revealed?.modelA ?? "확인 중"}</b></div>
              <div><span>B</span><b>{revealed?.modelB ?? "확인 중"}</b></div>
            </div>
            <div className="vote-bars" aria-label={`A ${pctA}%, B ${100 - pctA}%`}>
              <div><span style={{ width: `${pctA}%` }} /></div>
              <p><b>A {pctA}%</b><span>{totalVotes.toLocaleString("ko-KR")}명 선택</span><b>B {100 - pctA}%</b></p>
            </div>
            <button className="primary-action result-next" type="button" onClick={advance} disabled={isPending || !revealed}>
              {isLast ? "내 점수 확인하기" : "다음 문제"}<span>→</span>
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
