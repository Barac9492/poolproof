import Link from "next/link";
import { listProjects, getStats, getUserVotes, type SortKey } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import ProjectCard from "@/components/ProjectCard";

export const dynamic = "force-dynamic";

// Homepage-scoped metadata: the benchmark is the front door, without rebranding
// every route (docs/terms/pool pages keep their own titles).
// Positioning source of truth: docs/benchmark-pivot.md
export const metadata = {
  title: "poolproof — AI가 진짜 뭘 할 수 있나",
  description:
    "학습으로 미리 못 본 숨은 테스트(holdout)로만 채점하는, 조작 불가능한 AI 실행 벤치마크. SWE-bench류가 오염으로 부풀 때, 우리는 구조적으로 못 속인다.",
  openGraph: {
    title: "poolproof — AI가 진짜 뭘 할 수 있나",
    description:
      "숨은 테스트로만 채점하는 조작 불가능한 AI 실행 벤치마크. 되는 척과 진짜를 가른다.",
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
      {/* hero — AI 실행 벤치마크. Positioning source of truth: docs/benchmark-pivot.md */}
      <section className="flex flex-col items-start gap-10 pb-14 pt-6 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-xl flex-1">
          <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
            조작 불가능한 AI 실행 벤치마크
          </p>
          <h1 className="mt-4 text-[44px] font-bold leading-[1.04] tracking-[-0.03em] text-ink sm:text-[62px]">
            AI가 진짜
            <br />
            뭘 할 수 있나?
          </h1>
          <p className="mt-5 max-w-lg text-[16.5px] leading-relaxed text-ink-soft">
            데모도 벤치마크 숫자도 못 믿는 시대. 우리는 AI가{" "}
            <span className="font-semibold text-pine">학습으로 미리 못 본 숨은 테스트</span>로
            진짜 실행해 채점합니다. SWE-bench류가 오염으로 부풀 때, 여기선 구조적으로
            못 속입니다 — 됐으면 됐고, 죽었으면 정확히 어디서 죽었는지 박제됩니다.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="#board"
              className="rounded-lg bg-pine px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-pine-deep"
            >
              벤치마크 보기 →
            </Link>
            <Link
              href="/submit"
              className="rounded-lg border border-line bg-card px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:border-line-strong"
            >
              과제 출제하기
            </Link>
          </div>
          <p className="mt-4 font-mono text-[11.5px] text-faint">
            실행 {stats.runs}회 · green {stats.green}/{stats.projects} 스펙 — 숨은 테스트는
            공개하지 않습니다
          </p>
        </div>

        {/* teaser — the holdout gap: public 통과, holdout에서 사망 (josa 스펙 실례) */}
        <div className="w-full max-w-sm lg:shrink-0">
          <div className="rounded-2xl border border-line bg-card p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-semibold text-faint">holdout 갭</span>
              <span className="rounded-full border border-line bg-paper-deep/50 px-2 py-0.5 text-[10.5px] font-medium text-muted">
                josa · 조사 자동선택
              </span>
            </div>
            <div className="mt-3 space-y-2 font-mono text-[12.5px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">public (보이는 케이스)</span>
                <span className="tracking-[0.06em]">🟩🟩🟩🟩🟩🟩</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted">holdout (숨은 함정)</span>
                <span className="tracking-[0.06em]">🟩🟩💀</span>
              </div>
            </div>
            <p className="mt-3.5 text-[13px] leading-relaxed text-ink-soft">
              <span className="font-semibold text-ink">서울 + (으)로 → 서울로.</span> 받침
              토글이면 &lsquo;서울으로&rsquo;라 우기며 죽습니다. public은 다 통과하고
              holdout에서 무너지는 것 = <span className="font-semibold text-fail">되는 척</span>.
            </p>
          </div>
          <p className="mt-3 text-center font-mono text-[11px] text-faint">
            ↑ 진짜 능력은 숨은 테스트에서 갈립니다
          </p>
        </div>
      </section>

      {/* stats band — benchmark facts, no money layer */}
      <section className="grid grid-cols-2 gap-3 border-y border-line py-6 sm:grid-cols-4">
        <Stat label="등록 과제" value={String(stats.projects)} />
        <Stat label="green 통과" value={`${stats.green} / ${stats.projects}`} accent />
        <Stat label="실행 횟수" value={String(stats.runs)} />
        <Stat label="holdout 테스트" value="비공개" />
      </section>

      {/* benchmark board — the real specs with holdout suites, run against submissions */}
      <section id="board" className="scroll-mt-20 pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
              벤치마크 보드 · 실행으로 정산되는 과제
            </p>
            <h2 className="mt-1.5 text-[26px] font-bold tracking-tight text-ink">
              AI가 진짜 통과한 과제들.
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
