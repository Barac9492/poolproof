"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { pledgeAction } from "@/lib/actions";

const QUICK = [10, 50, 250, 1000];

export default function PledgeForm({
  id,
  slug,
  remaining,
  signedIn,
  balance = 0,
}: {
  id: number;
  slug: string;
  remaining: number;
  signedIn: boolean;
  balance?: number;
}) {
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(50);
  const max = Math.min(remaining, balance);
  const capped = Math.min(amount, max);

  return (
    <div className="rounded-2xl border border-escrow/25 bg-escrow-soft/50 p-5">
      <h3 className="font-mono text-[11px] tracking-[0.14em] text-escrow">PLEDGE TO ESCROW</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
        <span className="font-mono font-semibold text-ink">{remaining.toLocaleString()} cr</span>{" "}
        to fill. Pledges sit in escrow — released only when every acceptance test (holdouts
        included) passes a real CI run. No green by the deadline → full refund.
      </p>
      {signedIn && (
        <p className="mt-2 font-mono text-[11.5px] text-muted">
          your balance: {balance.toLocaleString()} cr
          {max <= 0 && (
            <Link href="/credits" className="ml-2 font-sans font-medium text-pine hover:underline">
              → get credits
            </Link>
          )}
        </p>
      )}
      {signedIn ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => setAmount(q)}
              className={`rounded-lg border px-3 py-1.5 font-mono text-[12.5px] transition ${
                amount === q
                  ? "border-escrow bg-card font-semibold text-escrow"
                  : "border-line bg-card text-muted hover:border-line-strong"
              }`}
            >
              {q.toLocaleString()}
            </button>
          ))}
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value) || 1))}
            className="w-24 rounded-lg border border-line bg-card px-3 py-1.5 font-mono text-[12.5px] text-ink focus:border-escrow focus:outline-none"
          />
          <button
            onClick={() => {
              const fd = new FormData();
              fd.set("amount", String(capped));
              startTransition(() => pledgeAction(id, fd));
            }}
            disabled={pending || capped <= 0}
            className="ml-auto rounded-lg bg-ink px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-soft disabled:opacity-50"
          >
            {pending ? "Escrowing…" : `Escrow ${capped.toLocaleString()} cr`}
          </button>
        </div>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(`/p/${slug}`)}`}
          className="mt-4 inline-block rounded-lg bg-ink px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-soft"
        >
          Sign in to pledge
        </Link>
      )}
    </div>
  );
}
