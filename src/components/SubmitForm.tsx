"use client";

import { useState } from "react";
import { submitChallengeAction } from "@/lib/game-actions";

export default function SubmitForm({
  promptId,
  handle,
  kind,
  prompt,
}: {
  promptId: number;
  handle: string;
  kind: string;
  prompt: string;
}) {
  const [pasteBlocked, setPasteBlocked] = useState(false);

  function blockPaste(e: React.ClipboardEvent | React.DragEvent) {
    e.preventDefault();
    setPasteBlocked(true);
    setTimeout(() => setPasteBlocked(false), 2500);
  }

  return (
    <form action={submitChallengeAction.bind(null, promptId)} className="mt-4">
      <div className="rounded-2xl border border-line bg-card p-5">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-line bg-paper-deep/50 px-2 py-0.5 text-[10.5px] font-medium text-muted">
            {kind}
          </span>
        </div>
        <p className="mt-2.5 text-[15px] font-semibold leading-relaxed text-ink">{prompt}</p>

        <textarea
          name="body"
          rows={4}
          maxLength={1000}
          required
          onPaste={blockPaste}
          onDrop={blockPaste}
          placeholder="여기에 직접 타이핑해 주세요. 붙여넣기는 막혀 있어요 — 진짜 사람 글만 받으려고요."
          className="mt-3.5 w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-3 text-[14.5px] leading-relaxed text-ink outline-none transition focus:border-pine"
        />
        {pasteBlocked && (
          <p className="mt-1.5 text-[12px] font-medium text-fail">
            붙여넣기는 막혀 있어요. AI가 쓴 글이 아니라 직접 쓴 글이어야 게임이 성립해요.
          </p>
        )}

        <div className="mt-3 space-y-2">
          <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            <input type="checkbox" name="no_ai" value="1" required className="mt-0.5 h-4 w-4 shrink-0 accent-pine" />
            <span>
              이 글은 <span className="font-semibold text-ink">AI로 생성하지 않고 제가 직접 썼습니다.</span>{" "}
              (AI 글을 사람 답으로 넣으면 게임의 정답지가 오염돼요.)
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-soft">
            <input type="checkbox" name="owns" value="1" required className="mt-0.5 h-4 w-4 shrink-0 accent-pine" />
            <span>
              판별 게임에서 익명 또는 <span className="font-mono">@{handle}</span> 명의로{" "}
              <span className="font-semibold text-ink">사용·공개</span>되는 것에 동의합니다.
            </span>
          </label>
        </div>
      </div>
      <button
        type="submit"
        className="mt-4 w-full rounded-xl bg-pine px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-pine-deep"
      >
        제출하기
      </button>
    </form>
  );
}
