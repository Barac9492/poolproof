import Link from "next/link";

// Shared layout + prose styling for a docs article.
export default function DocShell({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/docs" className="text-[12.5px] font-medium text-muted transition hover:text-ink">
        ← Docs
      </Link>
      <p className="mt-4 font-mono text-[11.5px] font-medium tracking-[0.16em] text-pine">{kicker}</p>
      <h1 className="mt-3 text-[32px] font-bold leading-tight tracking-[-0.02em] text-ink">{title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">{lede}</p>
      <div className="doc-prose mt-8 space-y-5 text-[14.5px] leading-relaxed text-ink-soft [&_h2]:mt-9 [&_h2]:text-[19px] [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-ink [&_h3]:mt-6 [&_h3]:text-[15px] [&_h3]:font-semibold [&_h3]:text-ink [&_strong]:font-semibold [&_strong]:text-ink [&_a]:font-medium [&_a]:text-pine [&_a]:underline [&_a]:underline-offset-2 [&_ul]:space-y-2 [&_ul]:pl-1 [&_li]:flex [&_li]:gap-2.5 [&_code]:rounded [&_code]:bg-paper-deep [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[13px] [&_code]:text-ink">
        {children}
      </div>
      <div className="mt-12 flex gap-3">
        <Link
          href="/submit"
          className="rounded-lg bg-pine px-5 py-2.5 text-[13.5px] font-semibold text-white transition hover:bg-pine-deep"
        >
          Post a spec
        </Link>
        <Link
          href="/"
          className="rounded-lg border border-line bg-card px-5 py-2.5 text-[13.5px] font-semibold text-ink transition hover:border-line-strong"
        >
          Browse pools
        </Link>
      </div>
    </article>
  );
}

export function Li({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pine" />
      <span>{children}</span>
    </li>
  );
}

export function Code({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-auto rounded-xl bg-ink px-4 py-3 font-mono text-[12.5px] leading-relaxed text-paper-deep">
      {children}
    </pre>
  );
}
