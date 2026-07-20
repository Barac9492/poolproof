// Polar (Merchant of Record) integration — replaces direct Stripe so a
// Korea-based seller can accept global card payments and receive payouts.
// Dormant until POLAR_ACCESS_TOKEN / POLAR_WEBHOOK_SECRET are set.
//
// Products are provisioned lazily on first checkout and cached in the `meta`
// table, so the only setup is two env vars — no manual dashboard product setup.

import { Polar } from "@polar-sh/sdk";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { getMeta, setMeta } from "./db";

export const CREDIT_PACKS = [
  { id: "starter", credits: 1000, usd: 10, label: "Starter" },
  { id: "backer", credits: 5500, usd: 50, label: "Backer", note: "10% bonus" },
  { id: "builder", credits: 12000, usd: 100, label: "Builder", note: "20% bonus" },
] as const;

export type PackId = (typeof CREDIT_PACKS)[number]["id"];

export function paymentsEnabled(): boolean {
  return Boolean(process.env.POLAR_ACCESS_TOKEN && process.env.POLAR_WEBHOOK_SECRET);
}

// Polar's sandbox is a separate environment; use it whenever the token is a
// sandbox token (they're prefixed) or POLAR_SERVER is explicitly set.
function polarServer(): "sandbox" | "production" {
  if (process.env.POLAR_SERVER === "production") return "production";
  if (process.env.POLAR_SERVER === "sandbox") return "sandbox";
  return (process.env.POLAR_ACCESS_TOKEN ?? "").includes("sandbox") ? "sandbox" : "production";
}

export function isSandbox(): boolean {
  return paymentsEnabled() && polarServer() === "sandbox";
}

function client(): Polar {
  return new Polar({
    accessToken: process.env.POLAR_ACCESS_TOKEN ?? "",
    server: polarServer(),
  });
}

/** Get (or lazily create + cache) the Polar product id for a credit pack. */
async function productIdFor(pack: (typeof CREDIT_PACKS)[number]): Promise<string> {
  const metaKey = `polar_product_${pack.id}_${polarServer()}`;
  const cached = await getMeta(metaKey);
  if (cached) return cached;

  const polar = client();
  const product = await polar.products.create({
    name: `${pack.credits.toLocaleString()} Poolproof credits`,
    recurringInterval: null,
    prices: [{ amountType: "fixed", priceAmount: pack.usd * 100, priceCurrency: "usd" }],
  });
  await setMeta(metaKey, product.id);
  return product.id;
}

export async function createCheckoutSession(input: {
  handle: string;
  packId: PackId;
  origin: string;
}): Promise<string | null> {
  if (!paymentsEnabled()) return null;
  const pack = CREDIT_PACKS.find((p) => p.id === input.packId);
  if (!pack) return null;
  try {
    const polar = client();
    const productId = await productIdFor(pack);
    const checkout = await polar.checkouts.create({
      products: [productId],
      successUrl: `${input.origin}/credits?status=success`,
      metadata: { handle: input.handle, credits: pack.credits },
    });
    return checkout.url;
  } catch (e) {
    console.error(`[polar] checkout failed: ${String(e instanceof Error ? e.message : e).slice(0, 400)}`);
    return null;
  }
}

export interface FulfillableOrder {
  orderId: string;
  handle: string;
  credits: number;
}

/**
 * Verify a Polar webhook (Standard Webhooks spec) and, if it is a paid order,
 * return the fulfillment info. Returns null for other events; throws only on a
 * genuinely invalid signature.
 */
export function parsePaidOrder(
  body: string,
  headers: Record<string, string>
): FulfillableOrder | null {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) throw new WebhookVerificationError("no webhook secret configured");
  const event = validateEvent(body, headers, secret);
  if (event.type !== "order.paid") return null;
  const data = event.data as unknown as { id?: unknown; metadata?: Record<string, unknown> };
  const orderId = typeof data.id === "string" ? data.id : null;
  const md = data.metadata ?? {};
  const handle = typeof md.handle === "string" ? md.handle : null;
  const credits = Number(md.credits);
  const allowedAmount = CREDIT_PACKS.some((pack) => pack.credits === credits);
  if (!orderId || !handle || !Number.isFinite(credits) || credits <= 0 || !allowedAmount) return null;
  return { orderId, handle, credits };
}

export { WebhookVerificationError };
