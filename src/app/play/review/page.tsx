import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getPendingSubmissions } from "@/lib/db";
import { approveSubmissionAction, rejectSubmissionAction } from "@/lib/game-actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제출 검토 — 판별 게임",
  robots: { index: false },
};

export default async function ReviewPage() {
  const user = await getSessionUser();
  if (!isAdmin(user?.handle)) notFound();

  const pending = await getPendingSubmissions();

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/play" className="text-[12.5px] font-medium text-muted transition hover:text-ink">
        ← 판별 게임
      </Link>
      <h1 className="mt-4 text-[28px] font-bold tracking-tight text-ink">제출 검토 큐</h1>
      <p className="mt-2 text-[14px] text-ink-soft">
        승인하면 사람 답 + AI 답 한 쌍으로 게임에 올라갑니다. 부적절한 글(욕설·개인정보·저작권)은 거절하세요.
      </p>

      <div className="mt-6 space-y-3.5">
        {pending.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card px-5 py-10 text-center text-[14px] text-muted">
            검토할 제출이 없어요.
          </p>
        ) : (
          pending.map((s) => (
            <div key={s.id} className="rounded-2xl border border-line bg-card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-line bg-paper-deep/50 px-2 py-0.5 text-[10.5px] font-medium text-muted">
                  {s.kind}
                </span>
                <span className="text-[12px] text-faint">
                  @{s.author} · {s.created_at} UTC
                </span>
                {s.no_ai === 1 && (
                  <span className="text-[11px] font-semibold text-pine">✓ AI 미사용 서약</span>
                )}
                {s.owns === 1 && (
                  <span className="text-[11px] font-semibold text-pine">✓ 사용 동의</span>
                )}
              </div>
              <p className="mt-2.5 text-[13px] font-medium text-muted">주제: {s.prompt}</p>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl border border-ink/15 bg-paper p-3.5">
                  <div className="font-mono text-[10.5px] tracking-[0.12em] text-muted">🙋 사람 (제출)</div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink">{s.body}</p>
                </div>
                <div className="rounded-xl border border-pine/20 bg-pine-wash p-3.5">
                  <div className="font-mono text-[10.5px] tracking-[0.12em] text-muted">
                    🤖 AI {s.ai_model && s.ai_model !== "bank" ? `· ${s.ai_model}` : "· 뱅크"}
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-soft">
                    {s.ai_body || <span className="text-fail">(AI 답 없음 — 승인 불가)</span>}
                  </p>
                </div>
              </div>

              <div className="mt-3.5 flex gap-2">
                <form action={approveSubmissionAction.bind(null, s.id)}>
                  <button
                    type="submit"
                    disabled={!s.ai_body}
                    className="rounded-lg bg-pine px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-pine-deep disabled:cursor-not-allowed disabled:bg-line-strong"
                  >
                    승인 → 게임에 추가
                  </button>
                </form>
                <form action={rejectSubmissionAction.bind(null, s.id)}>
                  <button
                    type="submit"
                    className="rounded-lg border border-line bg-card px-4 py-2 text-[13px] font-semibold text-fail transition hover:border-fail/40"
                  >
                    거절
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
