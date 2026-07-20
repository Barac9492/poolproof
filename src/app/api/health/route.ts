import { NextResponse } from "next/server";
import { dbBackend, getStats } from "@/lib/db";
import { holdoutsConfigured } from "@/lib/holdouts";

export const dynamic = "force-dynamic";

// Public, non-sensitive: confirms the DB backend and that a real query works.
// After wiring Turso, hit this on the deployed URL — durable:true means the
// leaderboard and pledges survive cold starts; durable:false means the
// ephemeral /tmp fallback is active (TURSO_DATABASE_URL is missing).
export async function GET() {
  const backend = dbBackend();
  const privateSuitesReady = holdoutsConfigured();
  try {
    const stats = await getStats();
    return NextResponse.json({
      ok: true,
      db: backend,
      durable: backend !== "ephemeral",
      holdoutsConfigured: privateSuitesReady,
      stats,
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        db: backend,
        durable: backend !== "ephemeral",
        holdoutsConfigured: privateSuitesReady,
        error: String(e instanceof Error ? e.message : e).slice(0, 300),
      },
      { status: 500 }
    );
  }
}
