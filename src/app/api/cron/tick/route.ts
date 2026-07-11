import { NextRequest, NextResponse } from "next/server";
import { expireSlots, refundExpiredProjects } from "@/lib/db";

// Daily housekeeping: expire overdue slots (half-stake burn) and refund
// projects past deadline. Invoked by Vercel Cron (Authorization header is
// injected automatically when CRON_SECRET is set).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const slotsExpired = await expireSlots();
  const projectsRefunded = await refundExpiredProjects();
  return NextResponse.json({ ok: true, slotsExpired, projectsRefunded });
}
