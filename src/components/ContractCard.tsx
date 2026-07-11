import type { ContractCard as Card } from "@/lib/db";

export default function ContractCard({ card }: { card: Card }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="border-b border-line px-5 py-4">
        <h3 className="font-mono text-[11px] tracking-[0.14em] text-muted">CONTRACT CARD</h3>
        <p className="mt-1 text-[12.5px] text-faint">
          plain-language deliverable — disputes are judged against this card, not the prose
        </p>
      </div>
      <div className="grid sm:grid-cols-2">
        <div className="p-5">
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-pine">You get</h4>
          <ul className="mt-3 space-y-2.5">
            {card.you_get.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-pine-soft text-[10px] font-bold text-pine-deep">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="border-t border-line bg-paper/60 p-5 sm:border-l sm:border-t-0">
          <h4 className="text-[12px] font-bold uppercase tracking-wide text-fail">
            You don&apos;t get
          </h4>
          <ul className="mt-3 space-y-2.5">
            {card.you_dont_get.map((item, i) => (
              <li key={i} className="flex gap-2.5 text-[13.5px] leading-relaxed text-muted">
                <span className="mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-fail-soft text-[10px] font-bold text-fail">
                  ✕
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
