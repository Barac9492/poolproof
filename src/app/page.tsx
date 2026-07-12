import Link from "next/link";
import { listProjects, getStats, getUserVotes, type SortKey } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import ProjectCard from "@/components/ProjectCard";
import HeroDemo from "@/components/HeroDemo";

export const dynamic = "force-dynamic";

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
      {/* 판별 게임 promo — traffic-first daily game */}
      <Link
        href="/play"
        className="mb-6 flex items-center gap-3 rounded-2xl border border-pine/25 bg-pine-wash px-5 py-3.5 transition hover:border-pine/45"
      >
        <span className="text-[22px]">🕵</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold text-ink">
            오늘의 판별 — 사람이 쓴 글일까, AI가 쓴 글일까?
          </span>
          <span className="block text-[12.5px] text-ink-soft">
            글 10개, 하루 한 판. 정답은 이미 정해진 답지 — 탐지기가 아닙니다.
          </span>
        </span>
        <span className="shrink-0 rounded-lg bg-pine px-3.5 py-2 text-[13px] font-semibold text-white">
          플레이 →
        </span>
      </Link>

      {/* hero */}
      <section className="flex flex-col items-start gap-10 pb-14 pt-6 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-xl flex-1">
          <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
            COMMUNITY-FUNDED SOFTWARE, VERIFIED
          </p>
          <h1 className="mt-4 text-[44px] font-bold leading-[1.04] tracking-[-0.03em] text-ink sm:text-[62px]">
            Fund outcomes,
            <br />
            not attempts.
          </h1>
          <p className="mt-5 max-w-lg text-[16.5px] leading-relaxed text-ink-soft">
            A spec here is an executable test suite, not a wish. Backers escrow credits behind it,
            a builder stakes for an exclusive slot, and a real CI run decides.{" "}
            <span className="font-semibold text-pine">Money moves only on green.</span>
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/submit"
              className="rounded-lg bg-pine px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-pine-deep"
            >
              Post a spec
            </Link>
            <Link
              href="/how"
              className="rounded-lg border border-line bg-card px-5 py-2.5 text-[14px] font-semibold text-ink transition hover:border-line-strong"
            >
              How it works
            </Link>
          </div>
        </div>
        <div className="w-full max-w-sm lg:shrink-0">
          <HeroDemo />
          <p className="mt-3 text-center font-mono text-[11px] text-faint">
            ↑ the whole product, one loop
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

      {/* pools */}
      <section className="pt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
              OPEN POOLS
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
