import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-mono text-5xl font-bold text-faint">404</p>
      <h1 className="mt-3 text-xl font-semibold text-ink">No such pool</h1>
      <p className="mt-2 text-sm text-muted">
        Nothing was ever escrowed here — so nothing needs refunding.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded bg-pine px-4 py-2 font-mono text-xs font-semibold text-white transition hover:bg-pine-deep"
      >
        ← BACK TO THE POOLS
      </Link>
    </div>
  );
}
