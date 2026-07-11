import type { Project } from "@/lib/db";

export default function EscrowBar({ p, compact = false }: { p: Project; compact?: boolean }) {
  const pct = Math.min(100, Math.floor((p.escrowed_credits / p.goal_credits) * 100));
  const released = p.status === "green";
  const barColor = released
    ? "bg-pine"
    : p.status === "building" || p.status === "open"
      ? "bg-build"
      : "bg-escrow";

  return (
    <div>
      <div className={`${compact ? "h-1.5" : "h-2"} w-full overflow-hidden rounded-full bg-paper-deep`}>
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className={`mt-2 flex items-baseline justify-between ${compact ? "text-[12px]" : "text-[13px]"}`}>
        <span className="font-mono text-muted">
          <span className="font-semibold text-ink">{p.escrowed_credits.toLocaleString()}</span>
          <span className="text-faint"> / {p.goal_credits.toLocaleString()} cr</span>
          <span className={released ? "ml-2 font-sans font-medium text-pine" : "ml-2 font-sans text-faint"}>
            {released ? "released on green" : "in escrow"}
          </span>
        </span>
        <span className="font-mono font-medium text-ink-soft">{pct}%</span>
      </div>
    </div>
  );
}
