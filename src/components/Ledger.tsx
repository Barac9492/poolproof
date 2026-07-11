import type { LedgerEntry } from "@/lib/db";

const TYPE_META: Record<string, { icon: string; cls: string }> = {
  pledge: { icon: "＋", cls: "bg-escrow-soft text-escrow" },
  stake: { icon: "◆", cls: "bg-slot-soft text-slot" },
  run: { icon: "⚙", cls: "bg-build-soft text-build" },
  payout: { icon: "→", cls: "bg-pine-soft text-pine-deep" },
  annuity: { icon: "∞", cls: "bg-pine-soft text-pine-deep" },
  spec_fee: { icon: "→", cls: "bg-pine-soft text-pine-deep" },
  platform_fee: { icon: "→", cls: "bg-paper-deep text-muted" },
  refund: { icon: "↩", cls: "bg-escrow-soft text-escrow" },
  status: { icon: "●", cls: "bg-paper-deep text-muted" },
};

export default function Ledger({ entries }: { entries: LedgerEntry[] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h3 className="font-mono text-[11px] tracking-[0.14em] text-muted">ESCROW LEDGER</h3>
        <span className="text-[12px] text-faint">every event, logged forever</span>
      </div>
      <ol className="divide-y divide-line/60">
        {entries.map((e) => {
          const meta = TYPE_META[e.type] ?? TYPE_META.status;
          return (
            <li key={e.id} className="flex items-start gap-3 px-5 py-3.5">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${meta.cls}`}
              >
                {meta.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] leading-relaxed text-ink-soft">{e.description}</p>
                <p className="mt-0.5 font-mono text-[11px] text-faint">
                  {e.actor} · {e.created_at} UTC
                </p>
              </div>
              {e.amount !== 0 && (
                <span
                  className={`shrink-0 font-mono text-[12.5px] font-semibold ${
                    e.amount > 0 ? "text-escrow" : "text-pine"
                  }`}
                >
                  {e.amount > 0 ? "+" : ""}
                  {e.amount.toLocaleString()} cr
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
