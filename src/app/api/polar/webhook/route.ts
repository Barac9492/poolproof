import { NextRequest, NextResponse } from "next/server";
import { parsePaidOrder, WebhookVerificationError } from "@/lib/polar";
import { grantCredits } from "@/lib/db";

// Polar fulfillment: order.paid → credit the buyer's balance.
// Dormant until POLAR_WEBHOOK_SECRET is configured.
export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  try {
    const order = parsePaidOrder(body, headers);
    if (order) await grantCredits(order.handle, order.credits);
    return NextResponse.json({ received: true });
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "invalid signature" }, { status: 403 });
    }
    console.error(`[polar] webhook error: ${String(e instanceof Error ? e.message : e).slice(0, 300)}`);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
