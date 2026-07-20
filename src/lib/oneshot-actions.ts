"use server";

import { cookies } from "next/headers";
import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { getSessionUser } from "./auth";
import { countOneShotToday, grantCredits } from "./db";
import { executeOneShot, getOneShotTask, liveModelEnabled, ONESHOT_GREEN_REWARD } from "./oneshot";

const ANON_COOKIE = "pp_player";
const ANON_TTL_S = 60 * 60 * 24 * 365;

/** Same identity resolution as the daily game: handle if signed in, else a
 * stable anonymous cookie — one-shot keeps the entry barrier at one line. */
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

export interface OneShotActionResult {
  ok: boolean;
  error?: "live-disabled" | "daily-limit" | "prompt-too-short" | "unknown-task" | "failed";
  verdict?: {
    green: boolean;
    diedAt: number | null;
    publicCells: boolean[];
    holdoutCells: boolean[];
    detail: string | null;
    display: string;
    /** Credits paid for this green — null when anonymous (nothing to credit). */
    creditsAwarded: number | null;
  };
}

/**
 * One prompt in, one verdict out. Gates: task must exist, live model must be
 * configured, 1 attempt per (task, player) per UTC day (league grammar + the
 * per-submission cost cap from docs/oneshot-strategy.md §9).
 */
export async function submitOneShotAction(slug: string, promptRaw: string): Promise<OneShotActionResult> {
  if (!getOneShotTask(slug)) return { ok: false, error: "unknown-task" };
  if (!liveModelEnabled()) return { ok: false, error: "live-disabled" };

  const prompt = String(promptRaw || "").trim();
  if (prompt.length < 4) return { ok: false, error: "prompt-too-short" };

  const { player, display } = await resolvePlayer();
  if ((await countOneShotToday(slug, player)) >= 1) return { ok: false, error: "daily-limit" };

  try {
    const { run, cells } = await executeOneShot(slug, prompt, player, display);

    // Earn-to-post entry: a green one-shot pays out — but only to an
    // accountable identity. Anonymous greens still get the public record.
    const signedIn = !player.startsWith("anon:");
    let creditsAwarded: number | null = null;
    if (run.green === 1 && signedIn) {
      await grantCredits(player, ONESHOT_GREEN_REWARD);
      creditsAwarded = ONESHOT_GREEN_REWARD;
    }

    revalidatePath("/oneshot");
    return {
      ok: true,
      verdict: {
        green: run.green === 1,
        diedAt: run.died_at,
        publicCells: cells.filter((c) => c.kind === "public").map((c) => c.pass),
        holdoutCells: cells.filter((c) => c.kind === "holdout").map((c) => c.pass),
        detail: run.green === 1 ? null : run.detail,
        display,
        creditsAwarded,
      },
    };
  } catch (e) {
    if (e instanceof Error && e.message === "live-disabled") return { ok: false, error: "live-disabled" };
    return { ok: false, error: "failed" };
  }
}
