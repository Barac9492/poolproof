import { NextRequest, NextResponse } from "next/server";
import { parsePaidOrder, paymentsEnabled, WebhookVerificationError } from "@/lib/polar";
import { dbBackend, fulfillPolarCredits } from "@/lib/db";

// Polar fulfillment: order.paid → credit the buyer's balance.
// Dormant until POLAR_WEBHOOK_SECRET is configured.
export async function POST(req: NextRequest) {
  if (!paymentsEnabled()) {
    return NextResponse.json({ error: "sandbox payments not configured" }, { status: 503 });
  }
  if (process.env.VERCEL && dbBackend() !== "turso") {
    return NextResponse.json({ error: "durable storage not configured" }, { status: 503 });
  }

  const body = await req.text();
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => (headers[k] = v));

  try {
    const order = parsePaidOrder(body, headers);
    const fulfilled = order
      ? await fulfillPolarCredits(order.orderId, order.handle, order.credits)
      : false;
    return NextResponse.json({ received: true, fulfilled });
  } catch (e) {
    if (e instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "invalid signature" }, { status: 403 });
    }
    console.error(`[polar] webhook error: ${String(e instanceof Error ? e.message : e).slice(0, 300)}`);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }
}
