import { NextRequest, NextResponse } from "next/server";
import { dbBackend, expireSlots, refundExpiredProjects } from "@/lib/db";

// Daily housekeeping: expire overdue slots (half-stake burn) and refund
// projects past deadline. Invoked by Vercel Cron (Authorization header is
// injected automatically when CRON_SECRET is set).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (process.env.VERCEL && dbBackend() !== "turso") {
    return NextResponse.json({ error: "durable storage not configured" }, { status: 503 });
  }
  // Project deadlines take precedence so an active builder receives the full
  // stake return before ordinary slot-expiry handling runs.
  const projectsRefunded = await refundExpiredProjects();
  const slotsExpired = await expireSlots();
  return NextResponse.json({ ok: true, slotsExpired, projectsRefunded });
}
