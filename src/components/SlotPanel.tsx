"use client";

import { useTransition, useState } from "react";
import Link from "next/link";
import { claimSlotAction, runVerificationAction } from "@/lib/actions";
import type { Slot } from "@/lib/db";

export function ClaimSlot({
  id,
  slug,
  stake,
  signedIn,
  balance = 0,
}: {
  id: number;
  slug: string;
  stake: number;
  signedIn: boolean;
  balance?: number;
}) {
  const [pending, startTransition] = useTransition();
  const canStake = balance >= stake;
  return (
    <div className="rounded-2xl border border-slot/25 bg-slot-soft/50 p-5">
      <h3 className="font-mono text-[11px] tracking-[0.14em] text-slot">BUILD SLOT OPEN</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
        Stake <span className="font-mono font-semibold text-ink">{stake.toLocaleString()} cr</span>{" "}
        (5% of pool) for a 7-day exclusive slot. Go green → stake back + 74% of the pool. Time out
        → part of the stake burns and the slot passes to the next builder. Your compute, your risk
        — that&apos;s the point.
      </p>
      {signedIn ? (
        <>
          <button
            onClick={() => startTransition(() => claimSlotAction(id))}
            disabled={pending || !canStake}
            className="mt-4 rounded-lg bg-ink px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-soft disabled:opacity-50"
          >
            {pending ? "Staking…" : `Stake ${stake.toLocaleString()} cr & claim slot`}
          </button>
          {!canStake && (
            <p className="mt-2 font-mono text-[11.5px] text-muted">
              balance {balance.toLocaleString()} cr — need {stake.toLocaleString()} cr to stake.{" "}
              <Link href="/credits" className="font-sans font-medium text-pine hover:underline">
                get credits
              </Link>
            </p>
          )}
        </>
      ) : (
        <Link
          href={`/login?next=${encodeURIComponent(`/p/${slug}`)}`}
          className="mt-4 inline-block rounded-lg bg-ink px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-soft"
        >
          Sign in to claim the slot
        </Link>
      )}
    </div>
  );
}

export function RunPanel({
  id,
  slot,
  submissions,
  signedIn,
  isSlotOwner,
  hasSuite,
}: {
  id: number;
  slot: Slot;
  submissions: string[];
  signedIn: boolean;
  isSlotOwner: boolean;
  hasSuite: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [submission, setSubmission] = useState(submissions[0] ?? "");

  return (
    <div className="rounded-2xl border border-build/25 bg-build-soft/50 p-5">
      <h3 className="font-mono text-[11px] tracking-[0.14em] text-build">
        ACTIVE SLOT — {slot.builder}
      </h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-ink-soft">
        Stake <span className="font-mono font-semibold text-ink">{slot.stake.toLocaleString()} cr</span>{" "}
        at risk. The runner executes every test — public + hidden holdouts — in an isolated
        process. Escrow moves only on green.
      </p>
      {!hasSuite ? (
        <p className="mt-3 text-[12.5px] text-muted">
          Executable suite is being curated from the public criteria — runs open once it lands.
        </p>
      ) : submissions.length === 0 ? (
        <p className="mt-3 text-[12.5px] text-muted">No submission uploaded yet — builder is working.</p>
      ) : isSlotOwner ? (
        <div className="mt-4 flex gap-2">
          <select
            value={submission}
            onChange={(e) => setSubmission(e.target.value)}
            className="flex-1 rounded-lg border border-line bg-card px-3 py-2 font-mono text-[12.5px] text-ink focus:border-build focus:outline-none"
          >
            {submissions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              const fd = new FormData();
              fd.set("submission", submission);
              startTransition(() => runVerificationAction(id, fd));
            }}
            disabled={pending || !submission}
            className="rounded-lg bg-ink px-5 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-soft disabled:opacity-50"
          >
            {pending ? "Running tests…" : "Run verification"}
          </button>
        </div>
      ) : (
        <p className="mt-3 text-[12.5px] text-muted">
          {signedIn
            ? `Only ${slot.builder} can trigger runs on this slot.`
            : "Sign in as the slot holder to trigger runs."}
        </p>
      )}
    </div>
  );
}
