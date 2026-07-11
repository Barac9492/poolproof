import Link from "next/link";
import type { ProjectWithSocial } from "@/lib/db";
import StatusBadge from "./StatusBadge";
import EscrowBar from "./EscrowBar";
import { VoteControl } from "./Social";

export default function ProjectCard({ p, myVote = 0 }: { p: ProjectWithSocial; myVote?: number }) {
  return (
    <div className="group flex gap-4 rounded-2xl border border-line bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_2px_4px_rgba(19,26,21,0.04),0_16px_32px_-20px_rgba(19,26,21,0.25)]">
      <VoteControl id={p.id} score={p.score} myVote={myVote} compact />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={p.status} />
          <span className="text-[12px] text-faint">
            {p.category} · spec by <span className="text-muted">{p.spec_author}</span>
          </span>
          <span className="ml-auto hidden items-center gap-3 text-[12px] text-faint sm:flex">
            <span>◉ {p.watchers}</span>
            <span>💬 {p.comment_count}</span>
          </span>
        </div>
        <Link href={`/p/${p.slug}`} className="mt-2 block">
          <h2 className="text-[17px] font-semibold leading-snug tracking-tight text-ink transition-colors group-hover:text-pine">
            {p.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-[13.5px] leading-relaxed text-muted">{p.summary}</p>
        </Link>
        {p.source_label && (
          <p className="mt-2 truncate text-[12px] text-faint">↳ {p.source_label}</p>
        )}
        <div className="mt-3.5">
          <EscrowBar p={p} compact />
        </div>
      </div>
    </div>
  );
}
