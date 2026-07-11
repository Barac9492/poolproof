export default function Legal({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold text-ink">{title}</h1>
      <p className="mt-1 font-mono text-xs text-muted">last updated {updated}</p>
      <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted [&_h2]:mt-6 [&_h2]:font-semibold [&_h2]:text-ink">
        {children}
      </div>
    </div>
  );
}
