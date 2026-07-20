import { cookies } from "next/headers";
import crypto from "node:crypto";
import { getOrCreateMeta, getUserById } from "./db";

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
  const candidate = crypto.randomBytes(32).toString("hex");
  const stored = await getOrCreateMeta("session_secret", candidate);
  const decoded = Buffer.from(stored, "hex");
  if (!/^[0-9a-f]{64}$/i.test(stored) || decoded.length !== 32) {
    throw new Error("invalid persisted session secret");
  }
  _secret = decoded;
  return decoded;
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

/** Moderation gate. Prefer immutable ADMIN_USER_ID; ADMIN_HANDLE remains a
 * reserved legacy fallback so no new account can claim it after deployment. */
export function isAdmin(user: Pick<User, "id" | "handle"> | undefined | null): boolean {
  if (!user) return false;
  const configuredId = Number(process.env.ADMIN_USER_ID);
  if (Number.isSafeInteger(configuredId) && configuredId > 0) return user.id === configuredId;
  const legacyHandle = process.env.ADMIN_HANDLE?.trim();
  return !!legacyHandle && user.handle.toLowerCase() === legacyHandle.toLowerCase();
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
