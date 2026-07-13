import Link from "next/link";
import { getLadder } from "@/lib/db";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ladder — Poolproof" };

export default async function LadderPage() {
  const rows = await getLadder(50);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">LADDER</p>
      <h1 className="mt-3 text-[32px] font-bold tracking-tight text-ink">
        Predict the winner. No stakes — just streaks.
      </h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-soft">
        Every pool lets you call GREEN or RED before the slot resolves. Free, always. Ranked by
        current streak — one wrong call and it resets to zero.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-line-strong bg-paper-deep/40 p-8 text-center text-[13.5px] text-muted">
          No resolved predictions yet.{" "}
          <Link href="/" className="text-pine hover:underline">
            Go call one
          </Link>
          .
        </div>
      ) : (
        <div className="mt-7 overflow-hidden rounded-2xl border border-line bg-card">
          <div className="grid grid-cols-[2.5rem_1fr_5rem_5rem_5rem] items-center gap-2 border-b border-line px-5 py-3 font-mono text-[10.5px] tracking-[0.12em] text-muted">
            <span>#</span>
            <span>HANDLE</span>
            <span className="text-right">STREAK</span>
            <span className="text-right">BEST</span>
            <span className="text-right">RECORD</span>
          </div>
          <div className="divide-y divide-line/60">
            {rows.map((r, i) => (
              <div
                key={r.handle}
                className="grid grid-cols-[2.5rem_1fr_5rem_5rem_5rem] items-center gap-2 px-5 py-3 text-[13.5px]"
              >
                <span className="font-mono text-[12px] text-faint">{i + 1}</span>
                <span className="truncate font-medium text-ink">@{r.handle}</span>
                <span className="text-right font-mono text-[13px] font-semibold text-ink">
                  {r.current > 0 ? `🔥 ${r.current}` : "—"}
                </span>
                <span className="text-right font-mono text-[12.5px] text-muted">{r.best}</span>
                <span className="text-right font-mono text-[12px] text-faint">
                  {r.correct}/{r.total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
