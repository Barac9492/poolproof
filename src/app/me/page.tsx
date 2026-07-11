import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getUserPledges, getUserSlots, getUserSpecs } from "@/lib/db";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "My activity — Poolproof" };

export default async function MePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/me");

  const [pledges, slots, specs] = await Promise.all([
    getUserPledges(user.handle),
    getUserSlots(user.handle),
    getUserSpecs(user.handle),
  ]);

  const escrowed = pledges.filter((p) => p.status === "escrowed").reduce((s, p) => s + p.amount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-ink">@{user.handle}</h1>
      <p className="mt-1 font-mono text-xs text-muted">
        member since {user.created_at} UTC · {escrowed.toLocaleString()} cr currently in escrow
      </p>

      <Section title="MY PLEDGES" empty={pledges.length === 0} emptyText="No pledges yet — pick a pool and escrow a few credits.">
        {pledges.map((pl) => (
          <li key={pl.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[11px] tracking-widest ${
                pl.status === "paid_out"
                  ? "border-pine/30 bg-pine-soft text-pine-deep"
                  : pl.status === "refunded"
                    ? "border-line bg-paper-deep text-muted"
                    : "border-escrow/30 bg-escrow-soft text-escrow"
              }`}
            >
              {pl.status.toUpperCase()}
            </span>
            <Link href={`/p/${pl.slug}`} className="min-w-0 flex-1 truncate text-sm text-ink-soft hover:text-pine">
              {pl.title}
            </Link>
            <span className="font-mono text-xs text-muted">{pl.amount.toLocaleString()} cr</span>
          </li>
        ))}
      </Section>

      <Section title="MY BUILD SLOTS" empty={slots.length === 0} emptyText="No slots claimed. Stake on an open pool to build.">
        {slots.map((s) => (
          <li key={s.id} className="flex items-center gap-3 px-4 py-3">
            <span
              className={`rounded border px-2 py-0.5 font-mono text-[11px] tracking-widest ${
                s.status === "succeeded"
                  ? "border-pine/30 bg-pine-soft text-pine-deep"
                  : s.status === "failed"
                    ? "border-fail/30 bg-fail-soft text-fail"
                    : "border-build/30 bg-build-soft text-build"
              }`}
            >
              {s.status.toUpperCase()}
            </span>
            <Link href={`/p/${s.slug}`} className="min-w-0 flex-1 truncate text-sm text-ink-soft hover:text-pine">
              {s.title}
            </Link>
            <span className="font-mono text-xs text-muted">stake {s.stake.toLocaleString()} cr</span>
          </li>
        ))}
      </Section>

      <Section title="MY SPECS" empty={specs.length === 0} emptyText="No specs authored. Post one — spec authors earn 3% of every payout.">
        {specs.map((p) => (
          <li key={p.id} className="flex items-center gap-3 px-4 py-3">
            <StatusBadge status={p.status} />
            <Link href={`/p/${p.slug}`} className="min-w-0 flex-1 truncate text-sm text-ink-soft hover:text-pine">
              {p.title}
            </Link>
            <span className="font-mono text-xs text-muted">
              {p.escrowed_credits.toLocaleString()}/{p.goal_credits.toLocaleString()} cr
            </span>
          </li>
        ))}
      </Section>
    </div>
  );
}

function Section({
  title,
  empty,
  emptyText,
  children,
}: {
  title: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-xl border border-line bg-card">
      <div className="border-b border-line px-4 py-3">
        <h2 className="font-mono text-xs tracking-widest text-muted">{title}</h2>
      </div>
      {empty ? (
        <p className="px-4 py-6 text-center text-sm text-faint">{emptyText}</p>
      ) : (
        <ul className="divide-y divide-line/60">{children}</ul>
      )}
    </div>
  );
}
