"use server";

import { cookies } from "next/headers";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser, isAdmin } from "./auth";
import { gradeAndRecord, getLeaderboard, todayKey, type Source, type GradeResult, type LeaderRow } from "./game";
import { createSubmission, approveSubmission, rejectSubmission } from "./db";

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

// ---------- supply loop: submit a challenge answer (login required) ----------

/**
 * Submit an answer to a challenge. Login is required here (the ownership claim
 * needs an accountable identity); anonymous play stays open. The submission
 * enters the review queue as `pending`.
 */
export async function submitChallengeAction(promptId: number, formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/play/submit")}`);

  const body = String(formData.get("body") || "").trim().slice(0, 1000);
  const isChecked = (v: FormDataEntryValue | null) => v === "on" || v === "1";
  const owns = isChecked(formData.get("owns"));
  const noAi = isChecked(formData.get("no_ai"));

  if (!body || body.length < 4) redirect(`/play/submit?prompt=${promptId}&error=body`);
  if (!owns) redirect(`/play/submit?prompt=${promptId}&error=owns`);
  if (!noAi) redirect(`/play/submit?prompt=${promptId}&error=noai`);

  const id = await createSubmission({ promptId, author: user.handle, body, owns, noAi });
  if (id === null) redirect(`/play/submit?prompt=${promptId}&error=prompt`);
  redirect("/play/submit?done=1");
}

// ---------- moderation (admin only) ----------

export async function approveSubmissionAction(id: number) {
  const user = await getSessionUser();
  if (!isAdmin(user?.handle)) return;
  await approveSubmission(id);
  revalidatePath("/play/review");
}

export async function rejectSubmissionAction(id: number) {
  const user = await getSessionUser();
  if (!isAdmin(user?.handle)) return;
  await rejectSubmission(id);
  revalidatePath("/play/review");
}
