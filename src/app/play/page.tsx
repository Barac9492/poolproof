import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import {
  getPlayItems,
  getMyPlay,
  getReveal,
  getLeaderboard,
  getDayStats,
  todayKey,
} from "@/lib/game";
import DetectorGame from "@/components/DetectorGame";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "오늘의 판별 — 사람이 쓴 글 vs AI가 쓴 글",
  description:
    "글 10개, 사람이 썼는지 AI가 썼는지 맞혀보세요. 정답은 출제 시점에 확정된 답지 — 탐지기가 아닙니다. 하루 한 판.",
  openGraph: {
    title: "오늘의 판별 — 사람일까, AI일까?",
    description: "글 10개, 사람 vs AI. 당신은 몇 개 맞힐 수 있나요? 하루 한 판.",
    type: "website",
  },
};

/** Read-only player id (never sets a cookie — that happens on submit). */
async function readPlayer(): Promise<string | null> {
  const user = await getSessionUser();
  if (user) return user.handle;
  const jar = await cookies();
  const id = jar.get("pp_player")?.value;
  return id && id.length >= 8 ? `anon:${id}` : null;
}

export default async function PlayPage() {
  const day = todayKey();
  const player = await readPlayer();
  const signedIn = !!(await getSessionUser());

  const prior = player ? await getMyPlay(day, player) : undefined;
  const [items, leaderboard, stats] = await Promise.all([
    getPlayItems(day),
    getLeaderboard(day),
    getDayStats(day),
  ]);

  const initialResult = prior
    ? {
        correct: prior.correct,
        total: prior.total,
        grid: prior.grid,
        reveal: await getReveal(day),
        alreadyPlayed: true as const,
        leaderboard,
      }
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <header className="pb-6">
        <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
          오늘의 판별 · {day} · UTC
        </p>
        <h1 className="mt-3 text-[36px] font-bold leading-[1.05] tracking-[-0.03em] text-ink sm:text-[46px]">
          사람이 썼을까,
          <br />
          AI가 썼을까?
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
          글 10개. 각각 사람이 썼는지, AI가 썼는지 고르세요. 정답은{" "}
          <span className="font-semibold text-pine">출제 시점에 이미 확정된 답지</span>예요 —
          탐지기가 찍어주는 게 아니라, 우리가 정답을 알고 냈습니다.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11.5px] text-faint">
          <span>오늘 {stats.players.toLocaleString()}명 참여</span>
          {stats.players > 0 && <span>· 평균 {stats.avg.toFixed(1)} / 10</span>}
          <span>· 하루 한 판</span>
        </div>
      </header>

      <DetectorGame day={day} items={items} signedIn={signedIn} initialResult={initialResult} />

      <p className="mt-10 text-center font-mono text-[11px] text-faint">
        정답지는 서버에만 있습니다 · 채점은 제출 후 공개 ·{" "}
        <Link href="/" className="underline decoration-line-strong underline-offset-2 hover:text-ink">
          poolproof
        </Link>
      </p>
    </div>
  );
}
