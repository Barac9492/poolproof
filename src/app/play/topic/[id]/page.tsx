import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTopicAnswers } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const data = await getTopicAnswers(Number(id));
  return {
    title: data ? `${data.prompt.kind} — 같은 주제, 다른 사람들` : "주제 — 판별 게임",
    description: "같은 주제에 사람들이 쓴 답을 나란히 비교하고, 그 사이에 숨은 AI 답을 확인하세요.",
  };
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getTopicAnswers(Number(id));
  if (!data) notFound();

  const humans = data.answers.filter((a) => a.source === "human");
  const ais = data.answers.filter((a) => a.source === "ai");

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/play/submit" className="text-[12.5px] font-medium text-muted transition hover:text-ink">
        ← 직접 문제 내기
      </Link>

      <div className="mt-4 rounded-2xl border border-line bg-card p-5">
        <span className="rounded-full border border-line bg-paper-deep/50 px-2 py-0.5 text-[10.5px] font-medium text-muted">
          {data.prompt.kind}
        </span>
        <h1 className="mt-2.5 text-[20px] font-bold leading-snug tracking-tight text-ink">
          {data.prompt.prompt}
        </h1>
        <p className="mt-2 text-[13px] text-ink-soft">
          같은 주제에 <span className="font-semibold text-ink">사람들이 쓴 답</span>을 나란히 놓고 비교하세요.
          맨 아래에 <span className="font-semibold text-pine">AI가 쓴 답</span>이 숨어 있어요.
        </p>
      </div>

      <h2 className="mt-7 font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
        🙋 사람들이 쓴 답 · {humans.length}
      </h2>
      <div className="mt-3 space-y-2.5">
        {humans.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line-strong bg-card px-5 py-8 text-center text-[13.5px] text-muted">
            아직 이 주제로 승인된 사람 답이 없어요.{" "}
            <Link href={`/play/submit?prompt=${id}`} className="font-semibold text-pine hover:underline">
              첫 답을 써보세요 →
            </Link>
          </div>
        ) : (
          humans.map((a, i) => (
            <div key={i} className="rounded-2xl border border-line bg-card p-4">
              <div className="font-mono text-[11px] font-semibold text-faint">
                {a.author ? `@${a.author}` : "익명"}
              </div>
              <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink">{a.body}</p>
            </div>
          ))
        )}
      </div>

      {ais.length > 0 && (
        <>
          <h2 className="mt-8 font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
            🤖 AI가 같은 주제로 쓴 답
          </h2>
          <div className="mt-3 space-y-2.5">
            {ais.map((a, i) => (
              <div key={i} className="rounded-2xl border border-pine/25 bg-pine-wash p-4">
                {a.model && a.model !== "bank" && (
                  <div className="font-mono text-[11px] font-semibold text-pine-deep">{a.model}</div>
                )}
                <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-ink-soft">{a.body}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link
          href={`/play/submit?prompt=${id}`}
          className="rounded-lg bg-pine px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-pine-deep"
        >
          나도 이 주제로 쓰기
        </Link>
        <Link
          href="/play"
          className="rounded-lg border border-line bg-card px-4 py-2 text-[13.5px] font-semibold text-ink transition hover:border-line-strong"
        >
          판별 게임
        </Link>
      </div>
    </div>
  );
}
