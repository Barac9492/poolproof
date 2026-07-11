import { providerEnabled, anyProviderEnabled } from "@/lib/oauth";

export const metadata = { title: "Sign in — Poolproof" };

const ERRORS: Record<string, string> = {
  unavailable: "That sign-in method isn't enabled yet. Use the other provider below, or check back shortly.",
  state: "Sign-in was interrupted or took too long (links expire after 10 minutes). Just click a button below to start again.",
  exchange: "The provider couldn't confirm your sign-in — usually a momentary hiccup on their side. Try the button again; if it persists, try the other provider.",
  expired: "Your sign-up session expired before you picked a handle. Click a button below to sign in again — it only takes a second.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const nextQ = next ? `?next=${encodeURIComponent(next)}` : "";
  const google = providerEnabled("google");
  const github = providerEnabled("github");
  const any = anyProviderEnabled();

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold text-ink">Sign in to Poolproof</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Pledging, staking and running verification all act under your handle on a permanent public
        ledger — so accounts are verified through your existing identity. No passwords to manage.
      </p>

      {error && (
        <div className="mt-5 rounded-lg border border-fail/30 bg-fail-soft px-4 py-3 text-sm text-fail">
          {ERRORS[error] ?? "Something went wrong. Please try again."}
        </div>
      )}

      <div className="mt-6 space-y-3">
        {github && (
          <a
            href={`/api/auth/github${nextQ}`}
            className="flex items-center justify-center gap-3 rounded-lg bg-ink px-4 py-3 text-[14px] font-semibold text-white transition hover:bg-ink-soft"
          >
            <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            Continue with GitHub
          </a>
        )}
        {google && (
          <a
            href={`/api/auth/google${nextQ}`}
            className="flex items-center justify-center gap-3 rounded-lg border border-line bg-card px-4 py-3 text-[14px] font-semibold text-ink transition hover:border-line-strong"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 01-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 009 18z" />
              <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 010-3.44V4.95H.96a9 9 0 000 8.1l3.01-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 00.96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
            </svg>
            Continue with Google
          </a>
        )}
      </div>

      {!any && (
        <div className="mt-6 rounded-lg border border-escrow/30 bg-escrow-soft px-4 py-3 text-[13px] text-escrow">
          Sign-in providers are being configured — check back shortly.
        </div>
      )}

      <p className="mt-6 text-center text-[12.5px] leading-relaxed text-faint">
        By continuing you agree to our{" "}
        <a href="/terms" className="text-muted underline underline-offset-2 hover:text-ink">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-muted underline underline-offset-2 hover:text-ink">
          Privacy Policy
        </a>
        .
      </p>
    </div>
  );
}
