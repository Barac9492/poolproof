"use client";

import { useState } from "react";

// Shows the real executable public test suite for a project. Makes the
// "spec = test suite" claim concrete instead of a black box.
export default function SuiteSource({ slug, source }: { slug: string; source: string }) {
  const [open, setOpen] = useState(false);
  const lines = source.split("\n").length;

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-paper/60"
      >
        <div>
          <h3 className="font-mono text-[11px] tracking-[0.14em] text-muted">EXECUTABLE SUITE</h3>
          <p className="mt-0.5 text-[12.5px] text-faint">
            the real {slug}/public.test.mjs the runner executes — {lines} lines, not a description
          </p>
        </div>
        <span className="font-mono text-[12px] text-muted">{open ? "hide ▲" : "view ▼"}</span>
      </button>
      {open && (
        <div className="border-t border-line/60">
          <pre className="max-h-[420px] overflow-auto bg-ink px-5 py-4 font-mono text-[11.5px] leading-relaxed text-paper-deep">
            {source}
          </pre>
          <div className="flex items-center justify-between border-t border-line/60 px-5 py-3">
            <span className="text-[11.5px] text-faint">
              hidden holdout tests are not shown — they exist to catch overfitting
            </span>
            <a
              href={`data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`}
              download={`${slug}.public.test.mjs`}
              className="font-mono text-[11.5px] font-medium text-pine hover:underline"
            >
              ↓ download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
