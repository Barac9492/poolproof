import crypto from "node:crypto";
import type { OAuthProvider } from "./db";

export interface ProviderProfile {
  providerId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  suggestedHandle: string;
}

export function providerEnabled(provider: OAuthProvider): boolean {
  return provider === "google"
    ? !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    : !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function anyProviderEnabled(): boolean {
  return providerEnabled("google") || providerEnabled("github");
}

function clientId(provider: OAuthProvider): string {
  return (provider === "google" ? process.env.GOOGLE_CLIENT_ID : process.env.GITHUB_CLIENT_ID) ?? "";
}
function clientSecret(provider: OAuthProvider): string {
  return (provider === "google" ? process.env.GOOGLE_CLIENT_SECRET : process.env.GITHUB_CLIENT_SECRET) ?? "";
}

export function redirectUri(origin: string, provider: OAuthProvider): string {
  return `${origin}/api/auth/${provider}/callback`;
}

// ---------- PKCE + state ----------

export function randomToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString("base64url");
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

// ---------- authorize URL ----------

export function authorizeUrl(input: {
  provider: OAuthProvider;
  origin: string;
  state: string;
  codeChallenge?: string;
}): string {
  const { provider, origin, state, codeChallenge } = input;
  const redirect = redirectUri(origin, provider);
  if (provider === "google") {
    const p = new URLSearchParams({
      client_id: clientId("google"),
      redirect_uri: redirect,
      response_type: "code",
      scope: "openid email profile",
      state,
      access_type: "online",
      prompt: "select_account",
    });
    if (codeChallenge) {
      p.set("code_challenge", codeChallenge);
      p.set("code_challenge_method", "S256");
    }
    return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
  }
  const p = new URLSearchParams({
    client_id: clientId("github"),
    redirect_uri: redirect,
    scope: "read:user user:email",
    state,
    allow_signup: "true",
  });
  return `https://github.com/login/oauth/authorize?${p}`;
}

// ---------- code -> profile ----------

function handleFromEmailOrName(email: string | null, name: string | null, fallback: string): string {
  const base = (email?.split("@")[0] || name || fallback)
    .toLowerCase()
    .replace(/[^a-z0-9_.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return base.length >= 3 ? base : `builder-${fallback.slice(0, 6)}`;
}

export async function exchangeCodeForProfile(input: {
  provider: OAuthProvider;
  origin: string;
  code: string;
  codeVerifier?: string;
}): Promise<ProviderProfile> {
  const { provider, origin, code, codeVerifier } = input;
  const redirect = redirectUri(origin, provider);

  if (provider === "google") {
    const body = new URLSearchParams({
      client_id: clientId("google"),
      client_secret: clientSecret("google"),
      code,
      grant_type: "authorization_code",
      redirect_uri: redirect,
    });
    if (codeVerifier) body.set("code_verifier", codeVerifier);
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!tokenRes.ok) throw new Error(`google token ${tokenRes.status}: ${(await tokenRes.text()).slice(0, 200)}`);
    const { access_token } = (await tokenRes.json()) as { access_token: string };
    const infoRes = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) throw new Error(`google userinfo ${infoRes.status}`);
    const info = (await infoRes.json()) as {
      sub: string;
      email?: string;
      email_verified?: boolean;
      name?: string;
      picture?: string;
    };
    const email = info.email_verified ? (info.email ?? null) : null;
    return {
      providerId: info.sub,
      email,
      name: info.name ?? null,
      avatarUrl: info.picture ?? null,
      suggestedHandle: handleFromEmailOrName(info.email ?? null, info.name ?? null, info.sub),
    };
  }

  // github
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      client_id: clientId("github"),
      client_secret: clientSecret("github"),
      code,
      redirect_uri: redirect,
    }),
  });
  if (!tokenRes.ok) throw new Error(`github token ${tokenRes.status}`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const headers = {
    Authorization: `Bearer ${access_token}`,
    "User-Agent": "poolproof",
    Accept: "application/vnd.github+json",
  };
  const userRes = await fetch("https://api.github.com/user", { headers });
  if (!userRes.ok) throw new Error(`github user ${userRes.status}`);
  const gh = (await userRes.json()) as { id: number; login: string; name?: string; avatar_url?: string };
  // primary verified email
  let email: string | null = null;
  const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
  if (emailsRes.ok) {
    const emails = (await emailsRes.json()) as { email: string; primary: boolean; verified: boolean }[];
    email = emails.find((e) => e.primary && e.verified)?.email ?? null;
  }
  return {
    providerId: String(gh.id),
    email,
    name: gh.name ?? null,
    avatarUrl: gh.avatar_url ?? null,
    suggestedHandle: handleFromEmailOrName(null, gh.login, String(gh.id)),
  };
}
