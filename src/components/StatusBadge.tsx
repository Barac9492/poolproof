import type { ProjectStatus } from "@/lib/db";

const STYLES: Record<ProjectStatus, { label: string; cls: string; dot: string }> = {
  funding: { label: "Escrow filling", cls: "bg-escrow-soft text-escrow", dot: "bg-escrow" },
  open: { label: "Slot open", cls: "bg-slot-soft text-slot", dot: "bg-slot" },
  building: { label: "Building", cls: "bg-build-soft text-build", dot: "bg-build animate-pulse" },
  green: { label: "Green · paid", cls: "bg-pine-soft text-pine-deep", dot: "bg-pine" },
  refunded: { label: "Refunded", cls: "bg-paper-deep text-muted", dot: "bg-faint" },
};

export default function StatusBadge({ status }: { status: ProjectStatus }) {
  const s = STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${s.cls}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}
