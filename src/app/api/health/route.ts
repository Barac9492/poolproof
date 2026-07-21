import { NextResponse } from "next/server";
import { dbBackend, getStats } from "@/lib/db";
import { holdoutsConfigured } from "@/lib/holdouts";

export const dynamic = "force-dynamic";

// Public, non-sensitive deployment readiness. Vercel is ready only when its
// durable DB, every private suite, and authenticated housekeeping cron exist.
export async function GET() {
  const backend = dbBackend();
  const durable = backend === "turso" || (!process.env.VERCEL && backend === "local");
  const privateSuitesReady = holdoutsConfigured();
  const cronConfigured = Boolean(process.env.CRON_SECRET);
  const ready = !process.env.VERCEL || (durable && privateSuitesReady && cronConfigured);
  try {
    const stats = await getStats();
    return NextResponse.json({
      ok: ready,
      db: backend,
      durable,
      holdoutsConfigured: privateSuitesReady,
      cronConfigured,
      stats,
    }, { status: ready ? 200 : 503 });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        db: backend,
        durable,
        holdoutsConfigured: privateSuitesReady,
        cronConfigured,
        error: String(e instanceof Error ? e.message : e).slice(0, 300),
      },
      { status: 500 }
    );
  }
}
