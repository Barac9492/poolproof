import Link from "next/link";
import { listProjects, getStats, getUserVotes, type SortKey } from "@/lib/db";
import { getDayStats, todayKey } from "@/lib/game";
import { getSessionUser } from "@/lib/auth";
import ProjectCard from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

// Homepage-scoped metadata: the game is the front door, without rebranding
// every route (docs/terms/pool pages keep their own titles).
export const metadata = {
  title: "오늘의 판별 — 당신의 눈, 아직 통합니까?",
  description:
    "사람 vs AI, 매일 10문항. 연인의 카톡부터 별점 리뷰까지 — 탐지기의 추측이 아니라 출제 시점에 확정된 정답지로 채점합니다. 하루 한 판.",
  openGraph: {
    title: "오늘의 판별 — 당신의 눈, 아직 통합니까?",
    description: "사람 vs AI, 매일 10문항. 당신은 몇 개나 맞힐 수 있을까요?",
  },
};

const FILTERS = [
  { key: "", label: "All" },
  { key: "funding", label: "Funding" },
  { key: "building", label: "Building" },
  { key: "green", label: "Green" },
] as const;

const SORTS: { key: SortKey; label: string }[] = [
  { key: "best", label: "Best" },
  { key: "voted", label: "Top voted" },
  { key: "raised", label: "Most escrowed" },
  { key: "new", label: "New" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; sort?: string }>;
}) {
  const { filter = "", sort = "best" } = await searchParams;
  const user = await getSessionUser();
  const projects = await listProjects(
    filter,
    (SORTS.some((s) => s.key === sort) ? sort : "best") as SortKey
  );
  const stats = await getStats();
  const day = await getDayStats(todayKey());
  const myVotes = user ? await getUserVotes(user.handle) : new Map<number, number>();

  const qs = (f: string, s: string) => {
    const p = new URLSearchParams();
    if (f) p.set("filter", f);
    if (s && s !== "best") p.set("sort", s);
    const str = p.toString();
    return str ? `/?${str}` : "/";
  };

  return (
    <div>
      {/* hero — 판별 게임 (traffic-first). Copy source of truth: docs/product-brief.md §6 */}
      <section className="flex flex-col items-start gap-10 pb-14 pt-6 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-xl flex-1">
          <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
            사람 vs AI · 매일 10문항 · 하루 한 판
          </p>
          <h1 className="mt-4 text-[44px] font-bold leading-[1.04] tracking-[-0.03em] text-ink sm:text-[62px]">
            당신의 눈,
            <br />
            아직 통합니까?
          </h1>
          <p className="mt-5 max-w-lg text-[16.5px] leading-relaxed text-ink-soft">
            연인의 카톡, 지원서, 별점 리뷰 — 이제 뭐든 AI가 썼을 수 있어요. 매일 글 10개로
            확인하세요. 탐지기의 추측이 아니라,{" "}
            <span className="font-semibold text-pine">출제 시점에 확정된 정답지</span>로
            채점합니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/play"
              className="rounded-lg bg-pine px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-pine-deep"
            >
              오늘의 판별 시작 →
            </Link>
            <Link
              href="/play/submit"
              className="rounded-lg border border-line bg-card px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:border-line-strong"
            >
              직접 문제 내기
            </Link>
          </div>
          {day.players > 0 && (
            <p className="mt-4 font-mono text-[11.5px] text-faint">
              오늘 {day.players.toLocaleString()}명 참여 · 평균 {day.avg.toFixed(1)}/10 —
              생각보다 어렵습니다
            </p>
          )}
        </div>

        {/* teaser card — sample question (not in the pool, so no answer-key leak) */}
        <div className="w-full max-w-sm lg:shrink-0">
          <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-faint">맛보기</span>
              <span className="rounded-full border border-line bg-paper-deep/50 px-2 py-0.5 text-[10.5px] font-medium text-muted">
                연애 카톡
              </span>
            </div>
            <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink">
              오늘 하루도 고생 많았어. 항상 네 편이라는 거 잊지 말고, 푹 쉬면서 좋은 꿈 꿔.
              내일도 응원할게!
            </p>
            <div className="mt-3.5 grid grid-cols-2 gap-2">
              <Link
                href="/play"
                className="rounded-xl border border-line bg-card px-3 py-2.5 text-center text-[14px] font-semibold text-ink-soft transition hover:border-pine hover:text-pine-deep"
              >
                🙋 사람
              </Link>
              <Link
                href="/play"
                className="rounded-xl border border-line bg-card px-3 py-2.5 text-center text-[14px] font-semibold text-ink-soft transition hover:border-pine hover:text-pine-deep"
              >
                🤖 AI
              </Link>
            </div>
          </div>
          <p className="mt-3 text-center font-mono text-[11px] text-faint">
            ↑ 답을 고르면 오늘의 10문항이 시작됩니다
          </p>
        </div>
      </section>

      {/* stats band */}
      <section className="grid grid-cols-2 gap-3 border-y border-line py-6 sm:grid-cols-4">
        <Stat label="credits in escrow" value={stats.escrowed.toLocaleString()} />
        <Stat label="released on green" value={stats.released.toLocaleString()} accent />
        <Stat label="verification runs" value={String(stats.runs)} />
        <Stat label="specs green" value={`${stats.green} / ${stats.projects}`} />
      </section>

      {/* pools — the original poolproof market, now secondary */}
      <section className="pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
              OPEN POOLS · POOLPROOF MARKET
            </p>
            <h2 className="mt-1.5 text-[26px] font-bold tracking-tight text-ink">
              Specs people can back right now.
            </h2>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex gap-1.5">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={qs(f.key, sort)}
                className={`rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                  filter === f.key
                    ? "bg-ink text-white"
                    : "border border-line bg-card text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {f.label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-faint">sort</span>
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={qs(filter, s.key)}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                  sort === s.key ? "bg-pine-soft text-pine-deep" : "text-muted hover:text-ink"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3.5">
          {projects.length === 0 ? (
            <p className="rounded-2xl border border-line bg-card px-5 py-10 text-center text-[14px] text-muted">
              Nothing here yet — be the first to post a spec.
            </p>
          ) : (
            projects.map((p) => <ProjectCard key={p.id} p={p} myVote={myVotes.get(p.id) ?? 0} />)
          )}
        </div>

        <p className="mt-8 text-center font-mono text-[11.5px] text-faint">
          every founding spec is based on a real, long-open OSS feature request
        </p>
      </section>
    </div>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="px-2">
      <div
        className={`font-mono text-[26px] font-bold tracking-tight ${accent ? "text-pine" : "text-ink"}`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[12px] font-medium text-muted">{label}</div>
    </div>
  );
}
