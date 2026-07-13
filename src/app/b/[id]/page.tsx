import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BlindArena from "@/components/BlindArena";
import { getGeneratedBattle } from "@/lib/db";
import { toPublicBattle, type Battle } from "@/lib/battles";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const row = await getGeneratedBattle(id);
  if (row?.category === "AI 냄새 테스트") {
    return {
      title: "친구가 보낸 AI 냄새 테스트",
      description: "한쪽은 원문, 한쪽은 AI 대안입니다. 더 사람이 직접 쓴 것 같은 메시지를 골라보세요.",
    };
  }
  return {
    title: "친구가 보낸 AI 블라인드 대결",
    description: "AI 이름은 선택한 뒤에 공개됩니다. 두 답변 중 더 마음에 드는 쪽을 골라보세요.",
  };
}

export default async function GeneratedBattlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await getGeneratedBattle(id);
  if (!row) notFound();

  const battle: Battle = {
    id: row.id,
    category: row.category,
    eyebrow: "친구가 만든 대결",
    prompt: row.prompt,
    optionA: { model: row.model_a, text: row.response_a },
    optionB: { model: row.model_b, text: row.response_b },
    seedA: 0,
    seedB: 0,
    source: "live",
    mode: row.category === "AI 냄새 테스트" ? "human_test" : "ai_duel",
  };

  return <BlindArena battles={[toPublicBattle(battle)]} sharedBattle />;
}
