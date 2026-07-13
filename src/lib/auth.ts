import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getMeta, setMeta, getUserById } from "./db";

export interface User {
  id: number;
  handle: string;
  created_at: string;
}

const SESSION_COOKIE = "pp_session";
const SESSION_TTL_S = 60 * 60 * 24 * 30; // 30 days

// ---------- secret management (persisted in DB meta table) ----------

let _secret: Buffer | null = null;

async function getSecret(): Promise<Buffer> {
  if (_secret) return _secret;
  const stored = await getMeta("session_secret");
  if (stored) {
    _secret = Buffer.from(stored, "hex");
  } else {
    _secret = crypto.randomBytes(32);
    await setMeta("session_secret", _secret.toString("hex"));
  }
  return _secret;
}

function sign(payload: string, secret: Buffer): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

// ---------- signed short-lived payloads (OAuth pending identity) ----------

/** Sign an arbitrary JSON payload for a tamper-proof short-lived cookie. */
export async function signPayload(obj: unknown, ttlSeconds: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const body = Buffer.from(JSON.stringify({ d: obj, exp })).toString("base64url");
  return `${body}.${sign(body, await getSecret())}`;
}

export async function verifyPayload<T = unknown>(token: string): Promise<T | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body, await getSecret());
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString()) as { d: T; exp: number };
    if (parsed.exp < Math.floor(Date.now() / 1000)) return null;
    return parsed.d;
  } catch {
    return null;
  }
}

// ---------- handle validation ----------

const HANDLE_RE = /^[a-zA-Z0-9_.-]{3,24}$/;

export function isValidHandle(handle: string): boolean {
  return HANDLE_RE.test(handle);
}

/** Moderation gate for the submission review queue. Set ADMIN_HANDLE to enable. */
export function isAdmin(handle: string | undefined | null): boolean {
  const admin = process.env.ADMIN_HANDLE?.trim();
  return !!admin && !!handle && handle.toLowerCase() === admin.toLowerCase();
}

// ---------- sessions (stateless HMAC token: uid.exp.sig) ----------

async function createSessionToken(userId: number): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + SESSION_TTL_S;
  const payload = `${userId}.${exp}`;
  return `${payload}.${sign(payload, await getSecret())}`;
}

async function parseSessionToken(token: string): Promise<number | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [uid, exp, sig] = parts;
  const payload = `${uid}.${exp}`;
  const expected = sign(payload, await getSecret());
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return null;
  if (Number(exp) < Math.floor(Date.now() / 1000)) return null;
  return Number(uid);
}

export async function setSessionCookie(userId: number) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_S,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const uid = await parseSessionToken(token);
  if (!uid) return null;
  try {
    const row = await getUserById(uid);
    return row ? { id: row.id, handle: row.handle, created_at: row.created_at } : null;
  } catch {
    return null;
  }
}
