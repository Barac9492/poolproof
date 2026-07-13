// AI counterpart generation for the 판별 game supply loop.
//
// Cost-staged by design:
//   초기 (early) — no ANTHROPIC_API_KEY set → use the prompt's curated bank
//     answer. Zero LLM cost, works out of the box.
//   후기 (mid/late) — set ANTHROPIC_API_KEY → each submission's AI counterpart
//     is generated live by Claude, automatically. No code change needed.

const MODEL = "claude-opus-4-8";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

/**
 * Produce the "AI half" of a challenge pair: an AI-written answer to the same
 * prompt the human answered. The human submission and this counterpart become a
 * two-item quiz. Always resolves — falls back to the curated bank on any error.
 */
export async function generateAiCounterpart(
  prompt: { prompt: string; kind: string; ai_answer: string | null }
): Promise<{ body: string; model: string }> {
  const key = process.env.ANTHROPIC_API_KEY;
  const bank = (prompt.ai_answer || "").trim();

  if (!key) {
    return { body: bank, model: "bank" };
  }

  try {
    const res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 300,
        output_config: { effort: "low" }, // keep per-submission cost down
        system:
          "너는 '사람 vs AI 판별' 게임의 출제자다. 주어진 창작 요청에 대해, 한국어로 자연스러운 답을 하나 써라. " +
          "설명·머리말·따옴표 없이 답 본문만. 한두 문장 분량. 이모지·불릿·번호 목록 금지.",
        messages: [
          {
            role: "user",
            content: `창작 요청 (${prompt.kind}): ${prompt.prompt}`,
          },
        ],
      }),
    });
    if (!res.ok) throw new Error(`anthropic ${res.status}`);
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error("empty completion");
    return { body: text, model: MODEL };
  } catch {
    // Live generation failed — fall back to the curated bank so submission never breaks.
    return { body: bank, model: "bank" };
  }
}
