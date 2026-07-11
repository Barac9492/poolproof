import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { OAuthProvider } from "@/lib/db";
import { providerEnabled, authorizeUrl, randomToken, pkceChallenge } from "@/lib/oauth";

// GET /api/auth/google | /api/auth/github — start the OAuth flow.
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: p } = await ctx.params;
  const provider = p as OAuthProvider;
  if ((provider !== "google" && provider !== "github") || !providerEnabled(provider)) {
    return NextResponse.redirect(new URL("/login?error=unavailable", req.url));
  }

  const origin = req.nextUrl.origin;
  const next = req.nextUrl.searchParams.get("next") || "/";
  const state = randomToken(24);
  const verifier = provider === "google" ? randomToken(32) : undefined;

  const url = authorizeUrl({
    provider,
    origin,
    state,
    codeChallenge: verifier ? pkceChallenge(verifier) : undefined,
  });

  const jar = await cookies();
  const cookieOpts = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  };
  jar.set(`oauth_state_${provider}`, state, cookieOpts);
  jar.set("oauth_next", next.startsWith("/") ? next : "/", cookieOpts);
  if (verifier) jar.set(`oauth_verifier_${provider}`, verifier, cookieOpts);

  return NextResponse.redirect(url);
}
