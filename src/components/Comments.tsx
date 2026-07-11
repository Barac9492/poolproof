"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { commentAction } from "@/lib/actions";
import type { Comment } from "@/lib/db";

export default function Comments({
  id,
  slug,
  comments,
  signedIn,
}: {
  id: number;
  slug: string;
  comments: Comment[];
  signedIn: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-card">
      <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
        <h3 className="font-mono text-[11px] tracking-[0.14em] text-muted">DISCUSSION</h3>
        <span className="text-[12px] text-faint">
          {comments.length} comment{comments.length === 1 ? "" : "s"}
        </span>
      </div>

      {comments.length > 0 && (
        <ul className="divide-y divide-line/60">
          {comments.map((c) => (
            <li key={c.id} className="px-5 py-3.5">
              <p className="text-[13.5px] leading-relaxed text-ink-soft">{c.body}</p>
              <p className="mt-1 font-mono text-[11px] text-faint">
                @{c.handle} · {c.created_at} UTC
              </p>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-line/60 bg-paper/50 p-4">
        {signedIn ? (
          <div className="flex gap-2">
            <textarea
              ref={ref}
              rows={1}
              maxLength={2000}
              placeholder="Question the spec, challenge the criteria…"
              className="flex-1 resize-none rounded-lg border border-line bg-card px-3 py-2 text-[13px] text-ink placeholder:text-faint focus:border-pine focus:outline-none"
            />
            <button
              onClick={() => {
                const body = ref.current?.value.trim();
                if (!body) return;
                const fd = new FormData();
                fd.set("body", body);
                startTransition(async () => {
                  await commentAction(id, fd);
                  if (ref.current) ref.current.value = "";
                });
              }}
              disabled={pending}
              className="self-end rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-soft disabled:opacity-50"
            >
              {pending ? "…" : "Post"}
            </button>
          </div>
        ) : (
          <p className="text-[12.5px] text-muted">
            <Link href={`/login?next=${encodeURIComponent(`/p/${slug}`)}`} className="font-medium text-pine hover:underline">
              Sign in
            </Link>{" "}
            to join the discussion.
          </p>
        )}
      </div>
    </div>
  );
}
