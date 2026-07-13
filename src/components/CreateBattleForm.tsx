"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics/react";
import { createGeneratedBattleAction } from "@/lib/generate-battle-action";

export default function CreateBattleForm() {
  const [prompt, setPrompt] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    if (prompt.trim().length < 5) return;
    setError(null);
    startTransition(async () => {
      const result = await createGeneratedBattleAction(prompt);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.id) {
        setCreatedId(result.id);
        track("battle_created", { prompt_length: prompt.trim().length });
      }
    });
  }

  async function copyInvite() {
    const url = `${window.location.origin}/b/${createdId}?from=friend`;
    const text = `AI 이름은 가렸어. 너라면 어느 쪽을 고를래?\n“${prompt.trim()}”\n${url}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    track("created_battle_shared", { share_method: "clipboard" });
  }

  return (
    <div className="create-card">
      {!createdId ? (
        <>
          <label htmlFor="battle-prompt">AI 둘에게 무엇을 시켜볼까요?</label>
          <textarea
            id="battle-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value.slice(0, 180))}
            placeholder="예: 소개팅 다음 날 보낼 카톡을 써줘"
            rows={4}
          />
          <div className="create-meta"><span>{prompt.length}/180</span><span>두 AI의 이름은 투표 전까지 숨겨져요.</span></div>
          {error && <p className="create-error" role="alert">{error}</p>}
          <button type="button" onClick={create} disabled={prompt.trim().length < 5 || isPending}>
            {isPending ? "두 AI가 답하는 중…" : "대결 만들기"} <span>{isPending ? "" : "→"}</span>
          </button>
        </>
      ) : (
        <div className="created-state">
          <div>✓</div>
          <p>질문이 준비됐어요</p>
          <h2>“{prompt.trim()}”</h2>
          <span>서로 다른 두 AI가 방금 답했어요. 모델 이름은 선택한 뒤에만 공개됩니다.</span>
          <Link href={`/b/${createdId}`} className="created-link">내 대결 먼저 해보기</Link>
          <button type="button" onClick={copyInvite}>{copied ? "초대 문구 복사됨" : "친구에게 보내기"}</button>
          <button type="button" className="text-button" onClick={() => setCreatedId(null)}>새 질문 만들기</button>
        </div>
      )}
    </div>
  );
}
