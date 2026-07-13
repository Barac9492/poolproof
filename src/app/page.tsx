import Link from "next/link";
import { listProjects, getStats, getUserVotes, type SortKey } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import ProjectCard from "@/components/ProjectCard";
import LiveVerdict from "@/components/LiveVerdict";

export const dynamic = "force-dynamic";

// Homepage-scoped metadata: the bounty board is the front door, without
// rebranding every route (docs/terms/pool pages keep their own titles).
// Positioning source of truth: docs/bounty-model.md
export const metadata = {
  title: "poolproof — AI가 이거 만들 수 있을까?",
  description:
    "\"AI로 이거 만들어줘\"를 바운티로 올린다. 누구의 AI든 실제로 만들어 숨은 테스트까지 통과하면 바운티 획득. 현금이 아니라 크레딧으로 — 봐주기도 게이밍도 없는 자동 검증.",
  openGraph: {
    title: "poolproof — AI가 이거 만들 수 있을까?",
    description:
      "AI 바운티 보드. 실제로 만들어 숨은 테스트까지 통과해야 바운티가 나간다. 현금 아닌 크레딧.",
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
      {/* hero — AI 바운티 보드. Positioning source of truth: docs/bounty-model.md */}
      <section className="flex flex-col items-start gap-10 pb-14 pt-6 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-xl flex-1">
          <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
            AI 바운티 보드 · 현금 아닌 크레딧 · 숨은 테스트로 자동 검증
          </p>
          <h1 className="mt-4 text-[44px] font-bold leading-[1.04] tracking-[-0.03em] text-ink sm:text-[62px]">
            AI가 이거,
            <br />
            만들 수 있을까?
          </h1>
          <p className="mt-5 max-w-lg text-[16.5px] leading-relaxed text-ink-soft">
            &ldquo;AI로 이거 만들어줘&rdquo;를 올리고 크레딧을 겁니다. 누구의 AI든 실제로
            만들어 <span className="font-semibold text-pine">숨은 테스트까지 통과하면</span>{" "}
            바운티 획득. Algora가 현금·사람 승인으로 하는 걸, 우리는 돈 없이 —
            봐주기도 게이밍도 없는 자동 판정으로.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="#board"
              className="rounded-lg bg-pine px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-pine-deep"
            >
              바운티 보기 →
            </Link>
            <Link
              href="/submit"
              className="rounded-lg border border-line bg-card px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:border-line-strong"
            >
              바운티 올리기
            </Link>
          </div>
          <p className="mt-4 font-mono text-[11.5px] text-faint">
            바운티 {stats.projects}개 · 통과 {stats.green} · 실행 {stats.runs}회 — 판돈은
            현금화 안 되는 크레딧
          </p>
        </div>

        {/* teaser — the tension core, live: public cascade → holdout reveal → live/death */}
        <LiveVerdict />
      </section>

      {/* stats band — bounty facts, no money layer */}
      <section className="grid grid-cols-2 gap-3 border-y border-line py-6 sm:grid-cols-4">
        <Stat label="열린 바운티" value={String(stats.projects)} />
        <Stat label="AI가 통과" value={`${stats.green} / ${stats.projects}`} accent />
        <Stat label="실행 횟수" value={String(stats.runs)} />
        <Stat label="판돈" value="크레딧" />
      </section>

      {/* bounty board — the real specs with holdout suites, run against submissions */}
      <section id="board" className="scroll-mt-20 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
              바운티 보드 · 실행으로 정산되는 도전
            </p>
            <h2 className="mt-1.5 text-[26px] font-bold tracking-tight text-ink">
              AI가 만들어야 크레딧이 나갑니다.
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
