import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifyPayload } from "@/lib/auth";
import { completeOnboardingAction } from "@/lib/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pick your handle — Poolproof" };

interface Pending {
  provider: string;
  email: string | null;
  name: string | null;
  suggestedHandle: string;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const jar = await cookies();
  const token = jar.get("oauth_pending")?.value;
  const pending = token ? await verifyPayload<Pending>(token) : null;
  if (!pending) redirect("/login?error=expired");

  return (
    <div className="mx-auto max-w-sm">
      <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
        ONE LAST STEP
      </p>
      <h1 className="mt-3 text-2xl font-bold text-ink">Pick your public handle</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Signed in with {pending.provider === "github" ? "GitHub" : "Google"}
        {pending.email ? ` as ${pending.email}` : ""}. Your handle is what appears on the public
        ledger next to your pledges, stakes and specs — pick something you&apos;re happy to show.
      </p>

      {error && (
        <div className="mt-5 rounded-lg border border-fail/30 bg-fail-soft px-4 py-3 text-sm text-fail">
          {error}
        </div>
      )}

      <form action={completeOnboardingAction} className="mt-6 space-y-4">
        <label className="block">
          <span className="mb-1.5 block font-mono text-xs text-muted">
            Handle <span className="text-faint">· 3-24 chars, letters/numbers/_/./-</span>
          </span>
          <input
            name="handle"
            required
            minLength={3}
            maxLength={24}
            pattern="[a-zA-Z0-9_.\-]{3,24}"
            defaultValue={pending.suggestedHandle}
            autoFocus
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-pine focus:outline-none"
          />
        </label>
        <button
          type="submit"
          className="w-full rounded-lg bg-pine py-2.5 font-mono text-sm font-semibold text-white transition hover:bg-pine-deep"
        >
          CLAIM HANDLE & CONTINUE
        </button>
      </form>
    </div>
  );
}
