"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics/react";
import { chooseBattleAction } from "@/lib/battle-actions";
import type { PublicBattle } from "@/lib/battles";
import { MessageResponse } from "@/components/ai-elements/message";

type Choice = "A" | "B";
type SavedState = {
  completed: string[];
  picks: Record<string, Choice>;
  models: Record<string, string>;
  shares: number;
};

const EMPTY: SavedState = { completed: [], picks: {}, models: {}, shares: 0 };
const FREE_REVEALS = 3;

function readState(): SavedState {
  try {
    const value = localStorage.getItem("poolproof-blind-state");
    return value ? { ...EMPTY, ...JSON.parse(value) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

export default function BlindArena({ battles, sharedBattle = false, hideIntro = false }: { battles: PublicBattle[]; sharedBattle?: boolean; hideIntro?: boolean }) {
  const [ready, setReady] = useState(false);
  const [state, setState] = useState<SavedState>(EMPTY);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [counts, setCounts] = useState<{ a: number; b: number } | null>(null);
  const [revealed, setRevealed] = useState<{ modelA: string; modelB: string } | null>(null);
  const [gateOpen, setGateOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [voteError, setVoteError] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = readState();
      setState(saved);
      setIndex(sharedBattle ? 0 : saved.completed.length % battles.length);
      setReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [battles.length, sharedBattle]);

  const battle = battles[index];
  // An inbound shared battle is the acquisition reward itself; never gate it
  // before the recipient gets one complete choose-and-reveal experience.
  const needsInvite = !sharedBattle && state.completed.length >= FREE_REVEALS && state.shares === 0;
  const total = counts ? counts.a + counts.b : battle.seedA + battle.seedB;
  const pctA = total > 0 ? Math.round(((counts?.a ?? battle.seedA) / total) * 100) : 50;
  const selectedModel = choice === "A" ? revealed?.modelA : revealed?.modelB;
  const humanTest = battle.mode === "human_test";

  const taste = useMemo(() => {
    const modelCounts = new Map<string, number>();
    for (const model of Object.values(state.models)) {
      modelCounts.set(model, (modelCounts.get(model) ?? 0) + 1);
    }
    return [...modelCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [state.models]);

  function persist(next: SavedState) {
    setState(next);
    localStorage.setItem("poolproof-blind-state", JSON.stringify(next));
  }

  function choose(nextChoice: Choice) {
    if (choice || isPending) return;
    if (needsInvite) {
      setGateOpen(true);
      track("invite_gate_opened", { completed_battles: state.completed.length });
      return;
    }
    setChoice(nextChoice);
    setVoteError(false);
    startTransition(async () => {
      try {
        const result = await chooseBattleAction(battle.id, nextChoice);
        setCounts(result);
        setRevealed({ modelA: result.modelA, modelB: result.modelB });
        track("battle_revealed", {
          battle_source: battle.source,
          choice: nextChoice,
          completed_battles: state.completed.length + 1,
        });
        const chosenModel = nextChoice === "A" ? result.modelA : result.modelB;
        if (!state.completed.includes(battle.id)) {
          persist({
            ...state,
            completed: [...state.completed, battle.id],
            picks: { ...state.picks, [battle.id]: nextChoice },
            models: { ...state.models, [battle.id]: chosenModel },
          });
        }
      } catch {
        setChoice(null);
        setVoteError(true);
      }
    });
  }

  function nextBattle() {
    setChoice(null);
    setCounts(null);
    setRevealed(null);
    setCopied(false);
    setVoteError(false);
    setIndex((current) => (current + 1) % battles.length);
  }

  async function shareBattle(unlock = false) {
    const url = battle.source === "live"
      ? `${window.location.origin}/b/${battle.id}?from=friend`
      : `${window.location.origin}/?battle=${battle.id}&from=friend`;
    const text = humanTest
      ? `한쪽은 원문, 한쪽은 AI래. 너라면 어느 쪽이 사람 같아?\n“${battle.prompt}”`
      : `AI 이름은 가렸어. 너라면 어느 쪽을 고를래?\n“${battle.prompt}”`;
    try {
      let shareMethod: "native" | "clipboard";
      if (navigator.share) {
        shareMethod = "native";
        await navigator.share({ title: "AI 블라인드 대결", text, url });
      } else {
        shareMethod = "clipboard";
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setCopied(true);
      }
      if (unlock) {
        persist({ ...state, shares: state.shares + 1 });
        setGateOpen(false);
      }
      track(unlock ? "invite_gate_unlocked" : "battle_shared", {
        battle_source: battle.source,
        share_method: shareMethod,
      });
    } catch {
      // The user cancelled the native share sheet.
    }
  }

  if (!ready) return <div className="arena-loading" aria-label="대결 불러오는 중" />;

  return (
    <div className="arena-shell">
      {!hideIntro && <section className="arena-intro">
        <div className="live-pill"><span /> {total === 0 ? (battle.source === "sample" ? "베타 샘플 · 지금 골라보세요" : "첫 투표를 기다리는 중") : `지금 ${total.toLocaleString("ko-KR")}명이 고르는 중`}</div>
        <h1>{humanTest ? <>사람 냄새일까,<br />AI 냄새일까.</> : <>AI 이름을 가리고<br />붙여봤다.</>}</h1>
        <p>{humanTest ? "한쪽은 원문, 다른 쪽은 AI가 다시 쓴 문장입니다. 더 사람이 직접 쓴 것 같은 쪽을 고르세요." : "설명은 필요 없어요. 더 마음에 드는 답을 고르면, 그때 누가 썼는지 알려드릴게요."}</p>
        <div className="progress-dots" aria-label={`${sharedBattle ? 1 : state.completed.length + 1}번째 대결`}>
          {battles.slice(0, 5).map((item, dotIndex) => (
            <span key={item.id} className={dotIndex === index ? "active" : state.completed.includes(item.id) ? "done" : ""} />
          ))}
        </div>
      </section>}

      <section className="battle-stage" data-testid="battle-stage">
        <header className="battle-prompt">
          <div><span>{battle.category}</span><span>·</span><span>익명 대결</span></div>
          <h2>{battle.prompt}</h2>
          {battle.context && <p>{battle.context}</p>}
        </header>

        <div className="answer-grid">
          <button
            type="button"
            data-testid="choice-a"
            className={`answer-card ${choice === "A" ? "selected" : ""} ${choice && choice !== "A" ? "muted" : ""}`}
            onClick={() => choose("A")}
            aria-label="A 답변 선택"
          >
            <span className="answer-label">A</span>
            <span className="answer-text"><MessageResponse>{battle.optionA.text}</MessageResponse></span>
            <span className="pick-hint">{humanTest ? "더 사람이 쓴 것 같아요" : "이 답이 더 좋아요"} <b>↗</b></span>
          </button>
          <button
            type="button"
            data-testid="choice-b"
            className={`answer-card ${choice === "B" ? "selected" : ""} ${choice && choice !== "B" ? "muted" : ""}`}
            onClick={() => choose("B")}
            aria-label="B 답변 선택"
          >
            <span className="answer-label">B</span>
            <span className="answer-text"><MessageResponse>{battle.optionB.text}</MessageResponse></span>
            <span className="pick-hint">{humanTest ? "더 사람이 쓴 것 같아요" : "이 답이 더 좋아요"} <b>↗</b></span>
          </button>
        </div>

        {!choice ? (
          <p className={`stage-footnote ${voteError ? "error" : ""}`}>
            {voteError ? "선택을 기록하지 못했어요. 다시 눌러주세요." : null}
            {!voteError && (
              <>
            {battle.source === "sample"
              ? humanTest ? "제품 흐름을 보여주는 큐레이션 샘플입니다. 원문 위치는 선택 후 공개됩니다." : "제품 흐름을 보여주는 큐레이션 샘플입니다. 모델 표기는 선택 후 공개됩니다."
              : humanTest ? "개인정보 패턴을 가린 실제 테스트입니다. 원문 위치는 선택 후에만 서버에서 공개됩니다." : "실제 AI Gateway 생성 기록입니다. 모델 이름은 선택 후에만 서버에서 공개됩니다."}
              </>
            )}
          </p>
        ) : (
          <div className="reveal-panel" data-testid="reveal-panel">
            <div className="reveal-kicker">{humanTest ? "사람들의 인상 판정" : "당신의 선택"}</div>
            <h3>{humanTest ? <><span>{choice}</span>의 정체는 <strong>{selectedModel ?? "확인 중"}</strong></> : <><span>{choice}</span>를 만든 AI는 <strong>{selectedModel ?? "확인 중"}</strong></>}</h3>
            <div className="model-reveal">
              <div><span>A</span><b>{revealed?.modelA ?? "확인 중"}</b></div>
              <div><span>B</span><b>{revealed?.modelB ?? "확인 중"}</b></div>
            </div>
            <div className="vote-bars" aria-label={`A ${pctA}%, B ${100 - pctA}%`}>
              <div><span style={{ width: `${pctA}%` }} /></div>
              <p><b>A {pctA}%</b><span>{total.toLocaleString("ko-KR")}명 참여</span><b>B {100 - pctA}%</b></p>
            </div>
            <div className="reveal-actions">
              {battles.length === 1 ? (
                <Link className="primary-action" href="/">다른 대결 보기 <span>→</span></Link>
              ) : (
                <button type="button" className="primary-action" onClick={nextBattle}>다음 대결 <span>→</span></button>
              )}
              <button type="button" className="secondary-action" onClick={() => shareBattle(false)}>{copied ? "링크 복사됨" : "친구에게 물어보기"}</button>
            </div>
          </div>
        )}
      </section>

      {!humanTest && state.completed.length > 0 && (
        <section className="taste-strip">
          <div><span>내 AI 취향</span><strong>{taste ?? "아직 분석 중"}</strong></div>
          <p>{state.completed.length}번의 선택으로 분석했어요. 더 고를수록 정확해져요.</p>
        </section>
      )}

      <section className="how-strip">
        <div><span>01</span><h3>{humanTest ? "정보 없이 읽고" : "이름 없이 읽고"}</h3><p>{humanTest ? "원문이 어느 쪽인지 숨겨요." : "브랜드가 아니라 결과만 봐요."}</p></div>
        <div><span>02</span><h3>{humanTest ? "사람 냄새를 고르고" : "마음으로 고르고"}</h3><p>{humanTest ? "탐지가 아니라 인상을 판정해요." : "정답은 없어요. 취향이 판정입니다."}</p></div>
        <div><span>03</span><h3>친구와 비교해요</h3><p>같은 메시지, 다른 선택이 더 재밌으니까.</p></div>
      </section>

      {gateOpen && (
        <div className="gate-backdrop" role="dialog" aria-modal="true" aria-labelledby="gate-title">
          <div className="gate-card">
            <button type="button" className="gate-close" onClick={() => setGateOpen(false)} aria-label="닫기">×</button>
            <div className="gate-icon">↗</div>
            <p>여기까지 {FREE_REVEALS}개 완료</p>
            <h2 id="gate-title">친구는 어느 쪽을<br />고를지 궁금하지 않나요?</h2>
            <span>이 대결을 한 명에게 보내면 다음 AI의 정체도 바로 공개돼요.</span>
            <button type="button" className="primary-action full" onClick={() => shareBattle(true)}>친구에게 보내고 계속하기</button>
            <button type="button" className="later-action" onClick={() => setGateOpen(false)}>내일 다시 올게요</button>
          </div>
        </div>
      )}
    </div>
  );
}
