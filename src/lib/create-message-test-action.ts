"use server";

import crypto from "node:crypto";
import { generateText } from "ai";
import { cookies } from "next/headers";
import { countRecentGeneratedBattles, saveGeneratedBattle } from "@/lib/db";

function maskPrivateDetails(input: string) {
  return input
    .replace(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g, "[이메일]")
    .replace(/(?:\+?82[-\s]?)?0?1[016789][-\s]?\d{3,4}[-\s]?\d{4}/g, "[전화번호]")
    .replace(/https?:\/\/\S+/gi, "[링크]")
    .replace(/\b\d{2,3}-\d{2,4}-\d{4}\b/g, "[전화번호]")
    .trim();
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

async function rewriteMessage(message: string, visitor: string) {
  const instruction = [
    "아래 한국어 메시지를 AI 냄새 테스트용 대안으로 다시 쓰세요.",
    "핵심 의미, 말투의 높임 정도, 감정과 대략적인 길이는 유지하세요.",
    "원문 문장을 그대로 복사하지 말고 자연스럽게 표현을 바꾸세요.",
    "설명, 따옴표, 제목, 마크다운 없이 다시 쓴 메시지만 출력하세요.",
    "개인정보 표기([전화번호], [이메일], [링크])는 그대로 유지하세요.",
    `원문: ${message}`,
  ].join("\n");

  for (const model of [
    { id: "anthropic/claude-haiku-4.5", name: "Claude Haiku 4.5" },
    { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash" },
  ]) {
    const result = await generateText({
      model: model.id,
      prompt: instruction,
      maxOutputTokens: 500,
      temperature: 0.85,
      providerOptions: {
        gateway: {
          user: visitor,
          tags: ["feature:human-message-test", "locale:ko"],
        },
      },
    });
    const text = result.text.trim();
    if (text && text !== message) return { text, model: model.name };
  }
  throw new Error("rewrite models returned no usable answer");
}

export async function createMessageTestAction(messageInput: string, relationshipInput: string) {
  const message = maskPrivateDetails(messageInput.replace(/\s+/g, " ").slice(0, 500));
  const allowedRelationships = new Set(["썸남", "썸녀", "남친", "여친", "직원", "거래처", "업무", "상대방"]);
  const relationship = allowedRelationships.has(relationshipInput) ? relationshipInput : "상대방";
  const subject: Record<string, string> = {
    썸남: "썸남이",
    썸녀: "썸녀가",
    남친: "남친이",
    여친: "여친이",
    직원: "직원이",
    거래처: "거래처에서",
    업무: "업무로 받은 메시지를",
    상대방: "상대방이",
  };

  if (message.length < 10) return { error: "판정할 메시지를 10자 이상 붙여넣어 주세요." };

  const visitor = await visitorId();
  if ((await countRecentGeneratedBattles(visitor)) >= 3) {
    return { error: "오늘 만들 수 있는 테스트를 모두 사용했어요. 만든 테스트를 친구에게 보내보세요." };
  }

  try {
    const alternative = await rewriteMessage(message, visitor);
    const originalIsA = crypto.randomInt(0, 2) === 0;
    const id = crypto.randomUUID();
    await saveGeneratedBattle({
      id,
      visitorId: visitor,
      prompt: relationship === "업무"
        ? "업무로 받은 이 메시지, 사람이 직접 쓴 것 같나요?"
        : `${subject[relationship]} 보낸 이 메시지, 사람이 직접 쓴 것 같나요?`,
      category: "AI 냄새 테스트",
      modelA: originalIsA ? "원문" : `AI 대안 · ${alternative.model}`,
      modelB: originalIsA ? `AI 대안 · ${alternative.model}` : "원문",
      responseA: originalIsA ? message : alternative.text,
      responseB: originalIsA ? alternative.text : message,
    });
    return { id, masked: message !== messageInput.trim() };
  } catch (error) {
    console.error("message test creation failed", error instanceof Error ? error.message : "unknown error");
    return { error: "지금은 비교 문장을 만들 수 없어요. 잠시 후 다시 시도해주세요." };
  }
}
