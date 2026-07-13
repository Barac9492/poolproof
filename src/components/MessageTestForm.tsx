"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { track } from "@vercel/analytics/react";
import { createMessageTestAction } from "@/lib/create-message-test-action";

const RELATIONSHIPS = ["썸남", "썸녀", "남친", "여친", "직원", "거래처", "업무", "상대방"];
const MESSAGE_PREFIX: Record<string, string> = {
  썸남: "썸남이 보낸",
  썸녀: "썸녀가 보낸",
  남친: "남친이 보낸",
  여친: "여친이 보낸",
  직원: "직원이 보낸",
  거래처: "거래처에서 보낸",
  업무: "업무로 받은",
  상대방: "상대방이 보낸",
};

export default function MessageTestForm() {
  const [relationship, setRelationship] = useState("썸남");
  const [message, setMessage] = useState("");
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [wasMasked, setWasMasked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    if (message.trim().length < 10) return;
    setError(null);
    startTransition(async () => {
      const result = await createMessageTestAction(message, relationship);
      if (result.error) return setError(result.error);
      if (result.id) {
        setCreatedId(result.id);
        setWasMasked(Boolean(result.masked));
        track("message_test_created", { relationship, message_length: message.trim().length });
      }
    });
  }

  if (createdId) {
    return (
      <div className="detector-ready" data-testid="message-test-ready">
        <div className="ready-check">✓</div>
        <p>블라인드 테스트 준비 완료</p>
        <h2>어느 쪽이 원문인지<br />직접 먼저 골라보세요.</h2>
        {wasMasked && <span>전화번호·이메일·링크는 자동으로 가렸어요.</span>}
        <Link href={`/b/${createdId}`} className="detector-primary">테스트 시작하기 <b>→</b></Link>
        <button type="button" onClick={() => { setCreatedId(null); setMessage(""); }}>다른 메시지 테스트</button>
      </div>
    );
  }

  return (
    <div className="detector-form">
      <div className="relationship-row" aria-label="메시지를 보낸 사람">
        {RELATIONSHIPS.map((item) => (
          <button key={item} type="button" className={relationship === item ? "active" : ""} onClick={() => setRelationship(item)}>{item}</button>
        ))}
      </div>
      <label htmlFor="message-input">{MESSAGE_PREFIX[relationship]} 메시지를 붙여넣으세요</label>
      <textarea
        id="message-input"
        value={message}
        onChange={(event) => setMessage(event.target.value.slice(0, 500))}
        placeholder="예: 아까 내가 말이 좀 심했던 것 같아. 집에 오는 길에 계속 마음에 걸렸어..."
        rows={5}
      />
      <div className="detector-meta"><span>{message.length}/500</span><span>전화번호·이메일·링크 자동 마스킹</span></div>
      {error && <p className="create-error" role="alert">{error}</p>}
      <button type="button" className="detector-primary" disabled={message.trim().length < 10 || isPending} onClick={create}>
        {isPending ? "AI 대조 문장 만드는 중…" : "AI 냄새 테스트 만들기"}<b>{isPending ? "" : "→"}</b>
      </button>
      <p className="detector-disclaimer">AI 작성 여부를 확정하는 탐지기가 아닙니다. 사람들이 느끼는 인상을 익명으로 비교합니다.</p>
    </div>
  );
}
