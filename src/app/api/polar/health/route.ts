import { NextRequest, NextResponse } from "next/server";
import { Polar } from "@polar-sh/sdk";

// Diagnostic: reports whether POLAR_ACCESS_TOKEN authenticates and against which
// server — WITHOUT ever exposing the token value. Gated behind CRON_SECRET.
export async function GET(req: NextRequest) {
  // Gated behind CRON_SECRET. Exposes only configuration presence and auth
  // status, never the token value, prefix, or length.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = process.env.POLAR_ACCESS_TOKEN ?? "";
  const serverEnv = process.env.POLAR_SERVER ?? "(auto)";
  const server: "sandbox" | "production" =
    process.env.POLAR_SERVER === "production"
      ? "production"
      : process.env.POLAR_SERVER === "sandbox"
        ? "sandbox"
        : token.includes("sandbox")
          ? "sandbox"
          : "production";

  const info = {
    tokenPresent: !!token,
    webhookSecretPresent: !!process.env.POLAR_WEBHOOK_SECRET,
    polarServerEnv: serverEnv,
    resolvedServer: server,
  };

  if (!token) return NextResponse.json({ ...info, auth: "no-token" });

  try {
    const polar = new Polar({ accessToken: token, server });
    const res = await polar.products.list({ limit: 1 });
    await res.next(); // force the actual HTTP request
    return NextResponse.json({ ...info, auth: "ok" });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ...info, auth: "failed", error: msg.slice(0, 400) });
  }
}
