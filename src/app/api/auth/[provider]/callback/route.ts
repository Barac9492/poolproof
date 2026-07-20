import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import type { OAuthProvider } from "@/lib/db";
import { getUserByProvider } from "@/lib/db";
import { providerEnabled, exchangeCodeForProfile } from "@/lib/oauth";
import { setSessionCookie, signPayload } from "@/lib/auth";
import { safeNextPath } from "@/lib/navigation";

// GET /api/auth/{provider}/callback — finish OAuth, set session or route to onboarding.
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider: p } = await ctx.params;
  const provider = p as OAuthProvider;
  const jar = await cookies();
  const fail = (reason: string) => NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));

  if ((provider !== "google" && provider !== "github") || !providerEnabled(provider)) {
    return fail("unavailable");
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const savedState = jar.get(`oauth_state_${provider}`)?.value;
  const next = safeNextPath(jar.get("oauth_next")?.value);
  const verifier = jar.get(`oauth_verifier_${provider}`)?.value;

  // clear one-time cookies regardless of outcome
  const clear = (res: NextResponse) => {
    res.cookies.delete(`oauth_state_${provider}`);
    res.cookies.delete(`oauth_verifier_${provider}`);
    res.cookies.delete("oauth_next");
    return res;
  };

  if (!code || !state || !savedState || state !== savedState) {
    return clear(fail("state"));
  }

  let profile;
  try {
    profile = await exchangeCodeForProfile({ provider, origin: req.nextUrl.origin, code, codeVerifier: verifier });
  } catch (e) {
    console.error(`[oauth] ${provider} exchange failed: ${String(e instanceof Error ? e.message : e).slice(0, 300)}`);
    return clear(fail("exchange"));
  }

  // existing user → sign in
  const existing = await getUserByProvider(provider, profile.providerId);
  if (existing) {
    await setSessionCookie(existing.id);
    return clear(NextResponse.redirect(new URL(next, req.url)));
  }

  // new user → carry a signed pending identity to the onboarding (handle) step
  const pending = await signPayload(
    {
      provider,
      providerId: profile.providerId,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.avatarUrl,
      suggestedHandle: profile.suggestedHandle,
      next,
    },
    900
  );
  const res = clear(NextResponse.redirect(new URL("/onboarding", req.url)));
  res.cookies.set("oauth_pending", pending, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 900,
    path: "/",
  });
  return res;
}
