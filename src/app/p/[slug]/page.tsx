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
import Replay from "@/components/Replay";
import { buildRunGrid } from "@/lib/grid";

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

  // arena mode: 콜로세움 frame (ticket/prize) — no finance widgets
  const arena = p.mode === "arena";

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
            {arena ? (
              <span className="inline-flex items-center rounded-full border border-pine/30 bg-pine-soft px-2.5 py-0.5 text-[11px] font-semibold text-pine-deep">
                🏛 오프닝 나이트
              </span>
            ) : (
              <StatusBadge status={p.status} />
            )}
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
        {arena && <ArenaBanner />}

        {runs.length > 0 && (
          <Replay grid={buildRunGrid(p.slug, runs[0], runs[0].results, runs[0].builder)} />
        )}

        {!arena && (
          <>
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
                74% builder · 15% maintenance annuity · 3% spec author · 8% platform. Full trail in
                the ledger below.
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
          </>
        )}

        {card && <ContractCard card={card} />}
        <TestList tests={tests} />
        {suiteSource && <SuiteSource slug={p.slug} source={suiteSource} />}
        <RunResults runs={runs} slug={p.slug} />
        <Comments id={p.id} slug={p.slug} comments={comments} signedIn={!!user} />
        {!arena && <Ledger entries={entries} />}
      </div>
    </div>
  );
}

function ArenaBanner() {
  return (
    <div className="overflow-hidden rounded-2xl border border-pine/25 bg-pine-wash">
      <div className="border-b border-pine/20 px-5 py-4">
        <h2 className="text-[15px] font-bold text-pine-deep">🏛 AI 콜로세움 — 오프닝 나이트</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
          AI가 이 Wordle 솔버를 <span className="font-semibold text-ink">라이브로</span> 짓습니다.
          공개 테스트 6개는 통과해요. 숨겨진 보스 단어(watch·mound·wound)가 진짜입니다 —
          살아남는지, 6수를 다 쓰고 죽는지 라이브로.
        </p>
      </div>
      <div className="grid sm:grid-cols-2">
        <div className="border-b border-line bg-card p-5 sm:border-b-0 sm:border-r">
          <h3 className="font-mono text-[10.5px] tracking-[0.14em] text-muted">상금</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            <span className="font-bold text-ink">$120 확정</span> — 그린 뜨면 빌더에게 지급.
            좌석이 몇 석 팔리든 동일. (여러분 돈은 티켓값이지 판돈이 아닙니다.)
          </p>
        </div>
        <div className="bg-card p-5">
          <h3 className="font-mono text-[10.5px] tracking-[0.14em] text-muted">오프닝 나이트 좌석</h3>
          <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-soft">
            <span className="font-bold text-ink">20석 · $20</span> — 넘버링(#1~20) + 이름 영구 각인
            + 라이브 관람 + 넘버 배지 + 다음 회차 우선.
          </p>
        </div>
      </div>
      <div className="border-t border-pine/20 px-5 py-4">
        <p className="text-[13px] leading-relaxed text-muted">
          투자 아님 · 양도/되팔이 안 됨 · 그냥{" "}
          <span className="font-medium text-ink-soft">그 순간에 있는 20명</span>. 참여:{" "}
          <span className="font-medium text-ink-soft">X에서 DM 또는 발표 글에 답글</span> → #번호 배정.
        </p>
        <p className="mt-2 text-[12px] text-faint">
          ↓ 아래는 실제 보스전 테스트 스위트입니다 — 함정이 진짜인지 직접 확인하세요.
        </p>
      </div>
    </div>
  );
}
