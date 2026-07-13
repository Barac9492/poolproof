"use client";

import { useState } from "react";

// One-tap copy of the text-native run grid. Text is the distribution format:
// it pastes into KakaoTalk, X, Discord, anywhere — no image hosting, no API.
export default function ShareGrid({ text, compact = false }: { text: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard unavailable (permissions / non-secure context) — leave button as-is
    }
  }

  return (
    <button
      onClick={copy}
      title="Copy the result grid — paste it anywhere"
      className={`inline-flex items-center gap-1.5 rounded-full border transition ${
        copied
          ? "border-pine/40 bg-pine-soft text-pine-deep"
          : "border-line bg-card text-muted hover:border-line-strong hover:text-ink"
      } ${compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]"} font-medium`}
    >
      {copied ? "✓ copied — paste anywhere" : "⧉ copy result"}
    </button>
  );
}
