import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import {
  getProject,
  getContractCard,
  getAcceptanceTests,
  getLedger,
  getRuns,
  getActiveSlot,
  getProjectSocial,
  getComments,
  getBalance,
} from "@/lib/db";
import { listSubmissions, specExists, readPublicSuite } from "@/lib/runner";
import { getSessionUser } from "@/lib/auth";
import StatusBadge from "@/components/StatusBadge";
import EscrowBar from "@/components/EscrowBar";
import PledgeForm from "@/components/PledgeForm";
import ContractCard from "@/components/ContractCard";
import TestList from "@/components/TestList";
import RunResults from "@/components/RunResults";
import SuiteSource from "@/components/SuiteSource";
import Ledger from "@/components/Ledger";
import Comments from "@/components/Comments";
import { ClaimSlot, RunPanel } from "@/components/SlotPanel";
import { VoteControl, WatchButton } from "@/components/Social";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) return { title: "Not found — Poolproof" };
  return {
    title: `${p.title} — Poolproof`,
    description: p.summary.slice(0, 160),
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) notFound();

  const user = await getSessionUser();
  const [card, tests, runs, slot, entries, comments, social] = await Promise.all([
    getContractCard(p.id),
    getAcceptanceTests(p.id),
    getRuns(p.id),
    getActiveSlot(p.id),
    getLedger(p.id),
    getComments(p.id),
    getProjectSocial(p.id, user?.handle),
  ]);
  const submissions = listSubmissions(p.slug);
  const hasSuite = specExists(p.slug);
  const suiteSource = hasSuite ? readPublicSuite(p.slug) : null;
  const balance = user ? await getBalance(user.handle) : 0;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-[12.5px] font-medium text-muted transition hover:text-ink">
        ← All pools
      </Link>

      <div className="mt-5 flex items-start gap-4">
        <VoteControl id={p.id} score={social.score} myVote={social.myVote} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={p.status} />
            <span className="text-[12px] text-faint">
              {p.category} · spec by <span className="text-muted">{p.spec_author}</span> ·{" "}
              {p.created_at} UTC
            </span>
            <span className="ml-auto">
              <WatchButton id={p.id} watchers={social.watchers} watching={social.watching} />
            </span>
          </div>
          <h1 className="mt-3 text-[28px] font-bold leading-tight tracking-tight text-ink">
            {p.title}
          </h1>
          <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">{p.summary}</p>
          {p.source_label && (
            <a
              href={p.source_url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-block text-[12.5px] text-muted underline decoration-line-strong underline-offset-2 transition hover:text-pine"
            >
              ↳ based on: {p.source_label}
            </a>
          )}
        </div>
      </div>

      <div className="mt-7 space-y-4">
        <div className="rounded-2xl border border-line bg-card p-5">
          <EscrowBar p={p} />
        </div>

        {p.status === "funding" && (
          <PledgeForm
            id={p.id}
            slug={p.slug}
            remaining={p.goal_credits - p.escrowed_credits}
            signedIn={!!user}
            balance={balance}
          />
        )}

        {p.status === "open" && (
          <ClaimSlot
            id={p.id}
            slug={p.slug}
            stake={Math.max(1, Math.floor(p.goal_credits * 0.05))}
            signedIn={!!user}
            balance={balance}
          />
        )}

        {p.status === "building" && slot && (
          <RunPanel
            id={p.id}
            slot={slot}
            submissions={submissions}
            signedIn={!!user}
            isSlotOwner={!!user && user.handle.toLowerCase() === slot.builder.toLowerCase()}
            hasSuite={hasSuite}
          />
        )}

        {p.status === "green" && (
          <div className="rounded-2xl border border-pine/25 bg-pine-wash p-5 text-[13.5px] leading-relaxed text-pine-deep">
            <span className="font-semibold">All acceptance tests green — escrow released.</span>{" "}
            74% builder · 15% maintenance annuity · 3% spec author · 8% platform. Full trail in the
            ledger below.
          </div>
        )}

        {!hasSuite && p.status === "funding" && (
          <div className="rounded-2xl border border-dashed border-line-strong bg-paper-deep/40 p-5 text-[13px] leading-relaxed text-muted">
            <span className="font-mono text-[11px] tracking-[0.14em] text-ink-soft">
              SUITE STATUS
            </span>{" "}
            · The public criteria below are being curated into an executable test suite (public +
            hidden holdouts). The pool can fill meanwhile, but no build slot opens — and no money
            can move — until the suite lands.
          </div>
        )}

        {card && <ContractCard card={card} />}
        <TestList tests={tests} />
        {suiteSource && <SuiteSource slug={p.slug} source={suiteSource} />}
        <RunResults runs={runs} />
        <Comments id={p.id} slug={p.slug} comments={comments} signedIn={!!user} />
        <Ledger entries={entries} />
      </div>
    </div>
  );
}
