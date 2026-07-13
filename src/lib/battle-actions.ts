"use server";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getBattle } from "@/lib/battles";
import { getBattleVoteCounts, getGeneratedBattle, recordBattleVote } from "@/lib/db";

export async function chooseBattleAction(battleId: string, choice: "A" | "B") {
  const sample = getBattle(battleId);
  const generated = sample ? undefined : await getGeneratedBattle(battleId);
  if ((!sample && !generated) || (choice !== "A" && choice !== "B")) throw new Error("invalid battle vote");

  const jar = await cookies();
  let visitorId = jar.get("pp_visitor")?.value;
  if (!visitorId) {
    visitorId = crypto.randomUUID();
    jar.set("pp_visitor", visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  await recordBattleVote(battleId, visitorId, choice);
  const live = await getBattleVoteCounts(battleId);
  return {
    a: (sample?.seedA ?? 0) + live.a,
    b: (sample?.seedB ?? 0) + live.b,
    modelA: sample?.optionA.model ?? generated!.model_a,
    modelB: sample?.optionB.model ?? generated!.model_b,
  };
}
