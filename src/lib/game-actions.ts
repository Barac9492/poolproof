"use server";

import { cookies } from "next/headers";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "./auth";
import { gradeAndRecord, getLeaderboard, todayKey, type Source, type GradeResult, type LeaderRow } from "./game";

const ANON_COOKIE = "pp_player";
const ANON_TTL_S = 60 * 60 * 24 * 365;

/** Resolve who is playing: signed-in handle, or a stable anonymous cookie id. */
async function resolvePlayer(): Promise<{ player: string; display: string }> {
  const user = await getSessionUser();
  if (user) return { player: user.handle, display: `@${user.handle}` };

  const jar = await cookies();
  let id = jar.get(ANON_COOKIE)?.value;
  if (!id || id.length < 8) {
    id = crypto.randomUUID();
    jar.set(ANON_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ANON_TTL_S,
      path: "/",
    });
  }
  return { player: `anon:${id}`, display: `익명#${id.slice(0, 4)}` };
}

export interface SubmitResult extends GradeResult {
  leaderboard: LeaderRow[];
}

/** Grade today's guesses, record the play, and return the reveal + leaderboard. */
export async function submitGuessesAction(guesses: Record<number, Source>): Promise<SubmitResult> {
  const day = todayKey();
  const { player, display } = await resolvePlayer();
  const result = await gradeAndRecord(day, player, display, guesses);
  const leaderboard = await getLeaderboard(day);
  revalidatePath("/play");
  return { ...result, leaderboard };
}
