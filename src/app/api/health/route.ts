import { NextResponse } from "next/server";
import { dbBackend, getStats } from "@/lib/db";

export const dynamic = "force-dynamic";

// Public, non-sensitive: confirms the DB backend and that a real query works.
// After wiring Turso, hit this on the deployed URL — durable:true means the
// leaderboard and pledges survive cold starts; durable:false means the
// ephemeral /tmp fallback is active (TURSO_DATABASE_URL is missing).
export async function GET() {
  const backend = dbBackend();
  const holdoutsConfigured = [
    process.env.HOLDOUT_JOSA_B64,
    process.env.HOLDOUT_MARKDOWN_ALERTS_B64,
    process.env.HOLDOUT_WORDLE_SOLVER_B64,
  ].every(Boolean);
  try {
    const stats = await getStats();
    return NextResponse.json({
      ok: true,
      db: backend,
      durable: backend !== "ephemeral",
      holdoutsConfigured,
      stats,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        db: backend,
        durable: backend !== "ephemeral",
        holdoutsConfigured,
        error: String(e instanceof Error ? e.message : e).slice(0, 300),
      },
      { status: 500 }
    );
  }
}
