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
    <div className="mx-auto min-h-[70vh] max-w-2xl px-5 py-16">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-2 font-mono text-xs text-neutral-500">마지막 업데이트 {updated}</p>
      <div className="mt-8 space-y-4 text-sm leading-relaxed text-neutral-600 [&_h2]:mt-7 [&_h2]:font-semibold [&_h2]:text-neutral-950">
        {children}
      </div>
    </div>
  );
}
