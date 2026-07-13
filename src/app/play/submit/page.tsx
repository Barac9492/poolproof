import Link from "next/link";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { getActivePrompts } from "@/lib/db";
import SubmitForm from "@/components/SubmitForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "직접 문제 내기 — 판별 게임",
  description: "주제에 맞춰 글을 써서 제출하면, AI가 같은 주제로 쓴 답과 짝지어 다른 사람들에게 출제됩니다.",
};

const ERRORS: Record<string, string> = {
  body: "내용을 4자 이상 입력해 주세요.",
  owns: "사용·공개 동의란에 체크해야 제출할 수 있어요.",
  noai: "‘직접 썼다(AI 미사용)’ 확인란에 체크해야 제출할 수 있어요.",
  prompt: "그 주제는 지금 받을 수 없어요. 다른 주제를 골라주세요.",
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string; error?: string; done?: string }>;
}) {
  const { prompt: promptParam, error, done } = await searchParams;
  const user = await getSessionUser();
  const prompts = await getActivePrompts();

  const selectedId = Number(promptParam) || prompts[0]?.id;
  const selected = prompts.find((p) => p.id === selectedId) ?? prompts[0];

  return (
    <div className="mx-auto max-w-xl">
      <Link href="/play" className="text-[12.5px] font-medium text-muted transition hover:text-ink">
        ← 판별 게임
      </Link>

      <h1 className="mt-4 text-[30px] font-bold leading-tight tracking-[-0.02em] text-ink">
        직접 문제 내기
      </h1>
      <p className="mt-2.5 text-[14.5px] leading-relaxed text-ink-soft">
        주제에 맞춰 글을 쓰면, <span className="font-semibold text-pine">AI가 같은 주제로 쓴 답</span>과
        짝지어 다른 사람들에게 출제됩니다. 당신 글이 &lsquo;사람 답&rsquo;이 되는 거예요.
      </p>

      {done && (
        <div className="mt-5 rounded-2xl border border-pine/25 bg-pine-wash p-4 text-[13.5px] leading-relaxed text-pine-deep">
          <span className="font-semibold">제출 완료!</span> 검토를 거쳐 게임에 올라가면 다른 사람들에게
          출제됩니다. 또 내고 싶으면 아래에서 이어서 쓰세요.
        </div>
      )}
      {error && ERRORS[error] && (
        <div className="mt-5 rounded-2xl border border-fail/30 bg-fail-soft p-4 text-[13.5px] text-fail">
          {ERRORS[error]}
        </div>
      )}

      {!user ? (
        <div className="mt-6 rounded-2xl border border-dashed border-line-strong bg-card p-6 text-center">
          <p className="text-[14px] text-ink-soft">
            출제하려면 로그인이 필요해요. (맞히기는 로그인 없이 가능)
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            소유권 확인과 출제자 표기를 위해서예요.
          </p>
          <Link
            href="/login?next=/play/submit"
            className="mt-4 inline-block rounded-lg bg-pine px-5 py-2.5 text-[14px] font-semibold text-white transition hover:bg-pine-deep"
          >
            로그인하고 출제하기 →
          </Link>
        </div>
      ) : !selected ? (
        <p className="mt-6 rounded-2xl border border-line bg-card px-5 py-8 text-center text-[14px] text-muted">
          지금 열린 주제가 없어요.
        </p>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-1.5">
            {prompts.map((p) => (
              <Link
                key={p.id}
                href={`/play/submit?prompt=${p.id}`}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition ${
                  p.id === selected.id
                    ? "bg-ink text-white"
                    : "border border-line bg-card text-muted hover:border-line-strong hover:text-ink"
                }`}
              >
                {p.kind}
              </Link>
            ))}
          </div>

          <SubmitForm
            promptId={selected.id}
            handle={user.handle}
            kind={selected.kind}
            prompt={selected.prompt}
          />

          <Link
            href={`/play/topic/${selected.id}`}
            className="mt-4 block rounded-xl border border-line bg-card px-4 py-3 text-center text-[13px] text-muted transition hover:border-line-strong hover:text-ink"
          >
            이 주제로 <span className="font-semibold text-ink">다른 사람들이 쓴 답</span> 보기 →
          </Link>

          <p className="mt-4 text-center font-mono text-[11px] text-faint">
            제출 → 검토 큐 → 승인되면 다른 사람들에게 출제
          </p>
        </>
      )}
    </div>
  );
}
