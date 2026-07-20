"use server";

import { revalidatePath } from "next/cache";
import { getSessionUser } from "./auth";
import { claimOneShotToday, releaseOneShotClaim } from "./db";
import { executeOneShot, getOneShotTask, liveModelEnabled } from "./oneshot";

export interface OneShotActionResult {
  ok: boolean;
  error?: "live-disabled" | "sign-in-required" | "daily-limit" | "prompt-too-short" | "unknown-task" | "failed";
  verdict?: {
    green: boolean;
    diedAt: number | null;
    publicCells: boolean[];
    holdoutCells: boolean[];
    detail: string | null;
    display: string;
    /** Credits paid for this green; null on a red result. */
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

  // Model calls have real marginal cost. Anonymous cookie rotation is not an
  // identity boundary, so live one-shots require an authenticated account.
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "sign-in-required" };
  const player = user.handle;
  const display = `@${user.handle}`;
  const attemptId = await claimOneShotToday(slug, player);
  if (!attemptId) return { ok: false, error: "daily-limit" };

  let runRecorded = false;
  try {
    const { run, cells, creditsAwarded } = await executeOneShot(attemptId, slug, prompt, player, display);
    // Run insertion and any green reward commit in the same DB transaction.
    runRecorded = true;

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
        creditsAwarded: run.green === 1 ? creditsAwarded : null,
      },
    };
  } catch (e) {
    if (!runRecorded) await releaseOneShotClaim(attemptId, slug, player);
    if (e instanceof Error && e.message === "live-disabled") return { ok: false, error: "live-disabled" };
    return { ok: false, error: "failed" };
  }
}
