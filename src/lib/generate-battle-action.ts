"use server";

import crypto from "node:crypto";
import { generateText } from "ai";
import { cookies } from "next/headers";
import { countRecentGeneratedBattles, saveGeneratedBattle } from "@/lib/db";
import { validateBattlePrompt } from "@/lib/prompt-validation";

const PAIRS = [
  [
    { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
    { id: "zai/glm-4.5-air", name: "GLM 4.5 Air" },
  ],
  [
    { id: "openai/gpt-5-mini", name: "GPT-5 mini" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  ],
] as const;

type ModelChoice = { id: string; name: string };

const FALLBACKS: Record<string, ModelChoice> = {
  "zai/glm-4.5-air": { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  "openai/gpt-5-mini": { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  "google/gemini-2.5-flash": { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
  "anthropic/claude-haiku-4.5": { id: "openai/gpt-5-mini", name: "GPT-5 mini" },
};

async function generateAnswer(model: ModelChoice, instruction: string, visitor: string) {
  const run = async (candidate: ModelChoice, maxOutputTokens: number) => {
    const result = await generateText({
      model: candidate.id,
      prompt: instruction,
      maxOutputTokens,
      temperature: 0.9,
      providerOptions: {
        gateway: {
          user: visitor,
          tags: ["feature:blind-battle", "locale:ko"],
        },
        ...(candidate.id.startsWith("zai/")
          ? { zai: { thinking: { type: "disabled" } } }
          : {}),
      },
    });
    return result.text.trim();
  };

  let text = await run(model, 700);
  if (!text) text = await run(model, 1100);
  if (text) return { text, model };

  // Some reasoning providers can occasionally finish without visible text.
  // Preserve a working battle and record the model that actually answered.
  const fallback = FALLBACKS[model.id];
  if (!fallback) throw new Error(`${model.id} returned an empty answer`);
  text = await run(fallback, 700);
  if (!text) throw new Error(`${model.id} and fallback returned empty answers`);
  return { text, model: fallback };
}

async function visitorId() {
  const jar = await cookies();
  let id = jar.get("pp_visitor")?.value;
  if (!id) {
    id = crypto.randomUUID();
    jar.set("pp_visitor", id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }
  return id;
}

export async function createGeneratedBattleAction(promptInput: string) {
  const prompt = promptInput.trim().replace(/\s+/g, " ").slice(0, 180);
  if (prompt.length < 5) return { error: "질문을 조금 더 구체적으로 써주세요." };
  const validationError = validateBattlePrompt(prompt);
  if (validationError) return { error: validationError };

  const visitor = await visitorId();
  if ((await countRecentGeneratedBattles(visitor)) >= 3) {
    return { error: "오늘 만들 수 있는 대결을 모두 사용했어요. 내일 다시 만들어주세요." };
  }

  const pair = PAIRS[Math.floor(Math.random() * PAIRS.length)];
  const instruction = [
    "당신은 한국 사용자를 위한 블라인드 AI 대결에 참가합니다.",
    "아래 요청에 바로 답하세요.",
    "모델명이나 자신에 대한 설명을 하지 마세요.",
    "마크다운 제목, 불릿, 굵은 글씨를 쓰지 마세요.",
    "자연스러운 한국어로 간결하게 답하고 350자를 넘기지 마세요.",
    `사용자 요청: ${prompt}`,
  ].join("\n");

  try {
    const [a, b] = await Promise.all(
      pair.map((model) => generateAnswer(model, instruction, visitor))
    );

    const id = crypto.randomUUID();
    await saveGeneratedBattle({
      id,
      visitorId: visitor,
      prompt,
      modelA: a.model.name,
      modelB: b.model.name,
      responseA: a.text.slice(0, 1200),
      responseB: b.text.slice(0, 1200),
    });
    return { id };
  } catch (error) {
    console.error("battle generation failed", error instanceof Error ? error.message : "unknown error");
    return { error: "지금은 AI 답변을 만들 수 없어요. 잠시 후 다시 시도해주세요." };
  }
}
