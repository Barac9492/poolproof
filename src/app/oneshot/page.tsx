import OneShotConsole from "@/components/OneShotConsole";
import { getOneShotBoard, getRecentOneShotRuns } from "@/lib/db";
import { ONESHOT_TASKS, liveModelEnabled } from "@/lib/oneshot";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
// Generation (~10–20s) + hardened run (≤15s) must fit inside the action window.
export const maxDuration = 60;

export const metadata = {
  title: "원샷 챌린지 — 프롬프트 1개, 실행 1번",
  description:
    "프롬프트 한 개로 AI가 코드를 쓰고, 수정 없이 딱 한 번 실행됩니다. 숨은 테스트가 판정 — 릴스의 체리픽도, 커뮤니티 말싸움도 아닌 진짜 원샷 성공률.",
};

export default async function OneShotPage() {
  const [board, recent, user] = await Promise.all([
    getOneShotBoard(),
    getRecentOneShotRuns(15),
    getSessionUser(),
  ]);
  const byTask = ONESHOT_TASKS.map((t) => {
    const rows = board.filter((b) => b.slug === t.slug);
    const attempts = rows.reduce((s, r) => s + Number(r.attempts), 0);
    const greens = rows.reduce((s, r) => s + Number(r.greens), 0);
    return { ...t, attempts, greens };
  });

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">
        원샷 챌린지 · 프롬프트 1개 · 실행 1번 · 수정 없음
      </p>
      <h1 className="mt-2 text-[34px] font-bold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[42px]">
        말 한마디로 앱?
        <br />
        그럼 증명해봐.
      </h1>
      <p className="mt-3.5 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        릴스에선 &ldquo;원샷에 앱 완성&rdquo;, 커뮤니티에선 &ldquo;그거 다 체리픽&rdquo;. 여기선
        말싸움 대신 실행합니다 — 당신의 프롬프트로 모델이 코드를 쓰고,{" "}
        <span className="font-semibold text-pine">수정 없이 딱 한 번</span> 돌립니다. 판정은 모델이
        학습 때 못 본 숨은 테스트가 합니다.
      </p>

      <div className="mt-7">
        <OneShotConsole
          tasks={ONESHOT_TASKS.map(({ slug, title, oneLiner }) => ({ slug, title, oneLiner }))}
          liveEnabled={liveModelEnabled()}
          signedIn={!!user}
        />
      </div>

      {/* 원샷 성공률 보드 — the number nobody else can publish */}
      <h2 className="mt-10 font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
        원샷 성공률
      </h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-card">
        {byTask.map((t, i) => (
          <div
            key={t.slug}
            className={`flex items-center gap-3 px-4 py-3 text-[13.5px] ${i > 0 ? "border-t border-line" : ""}`}
          >
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{t.title}</span>
            <span className="font-mono text-[12px] text-muted">{t.attempts}회 시도</span>
            <span className="font-mono text-[13px] font-bold text-pine">
              {t.attempts > 0 ? `${Math.round((t.greens / t.attempts) * 100)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
      <p className="mt-2 font-mono text-[11px] text-faint">
        성공률이 낮을수록 과제가 살아있다는 뜻입니다 — 목표 밴드 10–40%.
      </p>

      {/* 공개 기록 — greens AND deaths, both are content */}
      <h2 className="mt-10 font-mono text-[11.5px] font-medium tracking-[0.16em] text-muted">
        공개 기록 · 성공도 사망도 박제
      </h2>
      <div className="mt-3 space-y-2.5">
        {recent.length === 0 ? (
          <p className="rounded-2xl border border-line bg-card px-5 py-8 text-center text-[13px] text-muted">
            아직 기록이 없습니다 — 첫 원샷의 주인공이 되어보세요.
          </p>
        ) : (
          recent.map((r) => (
            <div
              key={r.id}
              className={`rounded-2xl border p-4 ${
                r.green ? "border-pine/30 bg-pine-wash" : "border-line bg-card"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold text-white ${
                    r.green ? "bg-pine" : "bg-fail"
                  }`}
                >
                  {r.green ? "원샷 통과" : r.died_at ? `홀드아웃 #${r.died_at} 사망` : "public 사망"}
                </span>
                <span className="text-[12px] font-medium text-ink-soft">{r.display}</span>
                <span className="ml-auto font-mono text-[10.5px] text-faint">
                  {ONESHOT_TASKS.find((t) => t.slug === r.slug)?.title ?? r.slug}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-ink-soft">
                {r.prompt}
              </p>
              <p className="mt-1.5 font-mono text-[11.5px] tracking-[0.05em] text-muted">
                public {r.public_pass}/{r.public_total} · holdout {r.holdout_pass}/{r.holdout_total}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
