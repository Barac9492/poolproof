import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getBalance } from "@/lib/db";
import { CREDIT_PACKS, paymentsEnabled, isSandbox } from "@/lib/polar";
import { buyCreditsAction } from "@/lib/actions";
import RefreshOnSuccess from "@/components/RefreshOnSuccess";

export const dynamic = "force-dynamic";
export const metadata = { title: "Credits — Poolproof" };

const STATUS_MSG: Record<string, { cls: string; text: string }> = {
  success: {
    cls: "border-pine/30 bg-pine-wash text-pine-deep",
    text: "Payment received — credits are landing in your balance now. This page refreshes on its own; no need to reload.",
  },
  cancelled: {
    cls: "border-line bg-paper-deep/40 text-muted",
    text: "Checkout cancelled — nothing was charged. Your balance is unchanged; pick a pack whenever you're ready.",
  },
  notyet: {
    cls: "border-escrow/30 bg-escrow-soft text-escrow",
    text: "Paid top-ups aren't live yet. Cause: card payments are still being configured for this beta. Meanwhile every account starts with 500 free credits — enough to back a spec or two.",
  },
  error: {
    cls: "border-fail/30 bg-fail-soft text-fail",
    text: "Couldn't open checkout — nothing was charged. This is usually a temporary payment-provider hiccup. Wait a few seconds and try again; if it keeps failing, send feedback via the link in the footer.",
  },
  invalid: {
    cls: "border-fail/30 bg-fail-soft text-fail",
    text: "That credit pack isn't recognized. Pick one of the packs below to continue.",
  },
};

export default async function CreditsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const user = await getSessionUser();
  const balance = user ? await getBalance(user.handle) : null;
  const live = paymentsEnabled();
  const testMode = isSandbox();
  const msg = status ? STATUS_MSG[status] : undefined;

  return (
    <div className="mx-auto max-w-2xl">
      <RefreshOnSuccess active={status === "success"} />
      <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">CREDITS</p>
      <h1 className="mt-3 text-[32px] font-bold tracking-tight text-ink">
        Build fuel, held in escrow until green.
      </h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
        Credits are prepaid units for backing specs and staking build slots. Not equity, not
        tokens, no returns — and until a pool you back goes green, your credits are refundable in
        full.
      </p>

      {testMode && (
        <div className="mt-5 flex items-center gap-2 rounded-xl border border-escrow/30 bg-escrow-soft px-4 py-3 text-[13px] text-escrow">
          <span className="rounded-full bg-escrow px-2 py-0.5 font-mono text-[10px] font-bold tracking-wide text-white">
            SANDBOX
          </span>
          Payments are in Polar sandbox — use test card 4242 4242 4242 4242 (any future expiry, any
          CVC). No real charge.
        </div>
      )}

      {msg && (
        <div className={`mt-5 rounded-xl border px-4 py-3 text-[13.5px] ${msg.cls}`}>{msg.text}</div>
      )}

      {user ? (
        <div className="mt-6 rounded-2xl border border-line bg-card p-5">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] tracking-[0.14em] text-muted">
              YOUR BALANCE — @{user.handle}
            </span>
            <span className="font-mono text-[26px] font-bold text-ink">
              {balance?.toLocaleString()} <span className="text-[14px] text-muted">cr</span>
            </span>
          </div>
          <p className="mt-1 text-[12.5px] text-faint">
            Every beta account starts with 500 free credits.
          </p>
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-line bg-card p-5 text-[13.5px] text-ink-soft">
          <Link href="/login?next=/credits" className="font-semibold text-pine hover:underline">
            Sign in with GitHub or Google
          </Link>{" "}
          to claim 500 free beta credits.
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {CREDIT_PACKS.map((pack) => (
          <form key={pack.id} action={buyCreditsAction} className="flex">
            <input type="hidden" name="pack" value={pack.id} />
            <button
              type="submit"
              disabled={!user}
              className="flex w-full flex-col rounded-2xl border border-line bg-card p-5 text-left transition hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_2px_4px_rgba(19,26,21,0.04),0_16px_32px_-20px_rgba(19,26,21,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">
                {pack.label}
              </span>
              <span className="mt-2 font-mono text-[24px] font-bold text-ink">
                {pack.credits.toLocaleString()} <span className="text-[13px] text-muted">cr</span>
              </span>
              <span className="mt-1 text-[13px] text-ink-soft">${pack.usd}</span>
              {"note" in pack && pack.note && (
                <span className="mt-2 inline-block self-start rounded-full bg-pine-soft px-2 py-0.5 text-[11px] font-semibold text-pine-deep">
                  {pack.note}
                </span>
              )}
            </button>
          </form>
        ))}
      </div>

      {!live && (
        <p className="mt-4 text-center font-mono text-[11.5px] text-faint">
          card payments go live shortly — packs are shown for transparency, nothing is charged in
          beta
        </p>
      )}
      {live && testMode && (
        <p className="mt-4 text-center font-mono text-[11.5px] text-faint">
          sandbox — pick a pack and pay with the 4242 test card to verify the full flow
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-line bg-card p-5 text-[13px] leading-relaxed text-muted">
        <span className="font-mono text-[11px] tracking-[0.14em] text-ink-soft">THE RULES</span> ·
        Credits fund verified build attempts. Escrowed credits refund in full if no green by the
        project deadline. Escrow released by an authenticated green run is final. Credits have no
        cash value in beta. See{" "}
        <Link href="/refunds" className="text-pine hover:underline">
          refund policy
        </Link>
        .
      </div>
    </div>
  );
}
