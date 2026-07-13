"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  pledge,
  claimSlot,
  getProject,
  createSpec,
  setVote,
  toggleWatch,
  addComment,
  getPredictionPanel,
  setPrediction,
  type Pick,
} from "@/lib/db";
import { runVerification, specExists } from "@/lib/runner";
import { CREDIT_PACKS, paymentsEnabled, createCheckoutSession, type PackId } from "@/lib/polar";
import { cookies } from "next/headers";
import {
  setSessionCookie,
  clearSessionCookie,
  getSessionUser,
  verifyPayload,
  isValidHandle,
} from "@/lib/auth";
import { isHandleTaken, createOAuthUser, type OAuthProvider } from "@/lib/db";

function refresh(slug: string) {
  revalidatePath("/");
  revalidatePath(`/p/${slug}`);
  revalidatePath("/me");
}

// ---------- auth ----------

interface PendingIdentity {
  provider: OAuthProvider;
  providerId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  suggestedHandle: string;
  next: string;
}

export async function completeOnboardingAction(formData: FormData) {
  const jar = await cookies();
  const token = jar.get("oauth_pending")?.value;
  const pending = token ? await verifyPayload<PendingIdentity>(token) : null;
  if (!pending) redirect("/login?error=expired");

  const handle = String(formData.get("handle") || "").trim();
  if (!isValidHandle(handle)) {
    redirect(`/onboarding?error=${encodeURIComponent("Handle must be 3-24 chars: letters, numbers, _ . -")}`);
  }
  if (await isHandleTaken(handle)) {
    redirect(`/onboarding?error=${encodeURIComponent("That handle is taken")}`);
  }

  let id: number;
  try {
    id = await createOAuthUser({
      handle,
      provider: pending.provider,
      providerId: pending.providerId,
      email: pending.email,
      name: pending.name,
      avatarUrl: pending.avatarUrl,
    });
  } catch {
    redirect(`/onboarding?error=${encodeURIComponent("Could not create account — please try again")}`);
  }
  await setSessionCookie(id);
  jar.delete("oauth_pending");
  redirect(pending.next.startsWith("/") ? pending.next : "/");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/");
}

// ---------- market actions (all require a session) ----------

export async function pledgeAction(id: number, formData: FormData) {
  const user = await getSessionUser();
  const p = await getProject(id);
  if (!p) return;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/p/${p.slug}`)}`);
  const amount = Number(formData.get("amount"));
  if (Number.isFinite(amount) && amount > 0) {
    await pledge(id, user.handle, Math.floor(amount));
  }
  refresh(p.slug);
}

export async function claimSlotAction(id: number) {
  const user = await getSessionUser();
  const p = await getProject(id);
  if (!p) return;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/p/${p.slug}`)}`);
  const stake = Math.max(1, Math.floor(p.goal_credits * 0.05));
  await claimSlot(id, user.handle, stake);
  refresh(p.slug);
}

export async function runVerificationAction(id: number, formData: FormData) {
  const user = await getSessionUser();
  const p = await getProject(id);
  if (!p) return;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/p/${p.slug}`)}`);
  const submission = String(formData.get("submission") || "");
  if (p.status !== "building" || !submission) return;
  try {
    await runVerification(p.id, p.slug, submission);
  } catch {
    // unknown submission — no run recorded
  }
  refresh(p.slug);
}

// ---------- social ----------

export async function voteAction(id: number, dir: 1 | -1 | 0) {
  const user = await getSessionUser();
  const p = await getProject(id);
  if (!p) return;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/p/${p.slug}`)}`);
  await setVote(id, user.handle, dir);
  refresh(p.slug);
}

export async function watchAction(id: number) {
  const user = await getSessionUser();
  const p = await getProject(id);
  if (!p) return;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/p/${p.slug}`)}`);
  await toggleWatch(id, user.handle);
  refresh(p.slug);
}

export async function predictAction(id: number, pick: Pick) {
  const user = await getSessionUser();
  const p = await getProject(id);
  if (!p) return;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/p/${p.slug}`)}`);
  const panel = await getPredictionPanel(id, user.handle);
  if (!panel || !panel.open) return;
  await setPrediction(id, panel.slotId, user.handle, pick);
  refresh(p.slug);
}

export async function commentAction(id: number, formData: FormData) {
  const user = await getSessionUser();
  const p = await getProject(id);
  if (!p) return;
  if (!user) redirect(`/login?next=${encodeURIComponent(`/p/${p.slug}`)}`);
  const body = String(formData.get("body") || "").trim().slice(0, 2000);
  if (body) await addComment(id, user.handle, body);
  refresh(p.slug);
}

// ---------- spec creation ----------

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export async function createSpecAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/submit")}`);

  const title = String(formData.get("title") || "").trim().slice(0, 120);
  const summary = String(formData.get("summary") || "").trim().slice(0, 1000);
  const source_label = String(formData.get("source_label") || "").trim().slice(0, 200);
  const source_url = String(formData.get("source_url") || "").trim().slice(0, 300);
  const category = String(formData.get("category") || "devtools").slice(0, 30);
  const goal = Number(formData.get("goal_credits"));
  const parseLines = (key: string, max: number) =>
    String(formData.get(key) || "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, max);
  const you_get = parseLines("you_get", 8);
  const you_dont_get = parseLines("you_dont_get", 8);
  const criteria = parseLines("criteria", 12);

  if (!title || !summary || !Number.isFinite(goal) || goal < 500 || you_get.length === 0 || criteria.length < 3) {
    redirect("/submit?error=1");
  }
  if (source_url && !/^https?:\/\//.test(source_url)) {
    redirect("/submit?error=2");
  }

  let slug = slugify(title) || `spec-${Date.now()}`;
  if (await getProject(slug)) slug = `${slug}-${Math.floor(Math.random() * 10000)}`;

  await createSpec({
    slug,
    title,
    summary,
    source_label,
    source_url,
    category,
    spec_author: user.handle,
    goal_credits: Math.floor(goal),
    you_get,
    you_dont_get,
    criteria,
  });
  revalidatePath("/");
  redirect(`/p/${slug}`);
}

// ---------- credits ----------

export async function buyCreditsAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/credits")}`);
  const packId = String(formData.get("pack") || "") as PackId;
  const pack = CREDIT_PACKS.find((p) => p.id === packId);
  if (!pack) redirect("/credits?status=invalid");
  if (!paymentsEnabled()) redirect("/credits?status=notyet");
  const { headers } = await import("next/headers");
  const h = await headers();
  const origin = `https://${h.get("host") ?? "poolproof.dev"}`;
  const url = await createCheckoutSession({ handle: user.handle, packId, origin });
  if (!url) redirect("/credits?status=error");
  redirect(url);
}

// re-export for server components
export async function hasSuite(slug: string): Promise<boolean> {
  return specExists(slug);
}
