import { createSpecAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import Link from "next/link";

export const metadata = { title: "Post a spec — Poolproof" };

const ERRORS: Record<string, string> = {
  "1": "Title, summary, a goal of at least 500 credits, at least one deliverable and 3+ acceptance criteria are required.",
  "2": "Source URL must start with http(s)://",
};

export default async function SubmitPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const user = await getSessionUser();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-ink">Post a spec</h1>
      <p className="mt-2 text-sm text-muted">
        Not a wish — a spec. Write the contract card and the acceptance criteria; our curators turn
        the criteria into an executable test suite (plus hidden holdouts) before any money can
        move. Spec authors earn <span className="text-pine">3% of the payout</span>.
      </p>

      {!user && (
        <div className="mt-4 rounded-lg border border-line bg-card px-4 py-3 text-sm text-ink-soft">
          You need an account to post a spec —{" "}
          <Link href="/login?next=/submit" className="text-pine hover:underline">
            sign in with GitHub or Google
          </Link>
          .
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-fail/30 bg-fail-soft px-4 py-3 text-sm text-fail">
          {ERRORS[error] ?? "Invalid input."}
        </div>
      )}

      <form action={createSpecAction} className="mt-6 space-y-5">
        <Field label="Title">
          <input
            name="title"
            required
            maxLength={120}
            placeholder="e.g. Comment-preserving YAML round-trip"
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-pine focus:outline-none"
          />
        </Field>

        <Field label="Summary" hint="what exists after green, in 2-3 sentences">
          <textarea
            name="summary"
            required
            rows={3}
            maxLength={1000}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-pine focus:outline-none"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Based on" hint="the real-world request, optional">
            <input
              name="source_label"
              maxLength={200}
              placeholder="e.g. js-yaml issue #14 (open since 2019)"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-pine focus:outline-none"
            />
          </Field>
          <Field label="Source URL" hint="optional">
            <input
              name="source_url"
              type="url"
              maxLength={300}
              placeholder="https://github.com/…"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-pine focus:outline-none"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              name="category"
              className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink focus:border-pine focus:outline-none"
            >
              <option value="devtools">devtools</option>
              <option value="tool">tool</option>
              <option value="data">data</option>
              <option value="education">education</option>
              <option value="media">media</option>
              <option value="finance">finance</option>
            </select>
          </Field>
          <Field label="Credit goal" hint="min 500 — pools under 500 run as commissions">
            <input
              name="goal_credits"
              type="number"
              min={500}
              defaultValue={2000}
              required
              className="w-full rounded-lg border border-line bg-card px-3 py-2 font-mono text-sm text-ink focus:border-pine focus:outline-none"
            />
          </Field>
        </div>

        <Field label="Contract card — YOU GET" hint="one deliverable per line">
          <textarea
            name="you_get"
            required
            rows={3}
            placeholder={"A JS module exporting …\nMIT-licensed source + the verified test suite"}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-pine focus:outline-none"
          />
        </Field>

        <Field label="Contract card — YOU DON'T GET" hint="explicit exclusions, one per line">
          <textarea
            name="you_dont_get"
            rows={2}
            placeholder={"No UI — library only\nNo Windows support in this spec"}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-pine focus:outline-none"
          />
        </Field>

        <Field label="Acceptance criteria" hint="3+ testable statements, one per line — these become the public test suite">
          <textarea
            name="criteria"
            required
            rows={5}
            placeholder={"parses X and returns Y\nrejects invalid input with null\nround-trips Z without loss"}
            className="w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-pine focus:outline-none"
          />
        </Field>

        <button
          type="submit"
          disabled={!user}
          className="w-full rounded-lg bg-pine py-2.5 font-mono text-sm font-semibold text-white transition hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          PUBLISH SPEC → OPEN ESCROW
        </button>
        <p className="text-center font-mono text-[11px] text-faint">
          no build slot opens — and no money moves — until the executable suite lands
        </p>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-xs tracking-wide text-muted">
        {label}
        {hint && <span className="ml-2 text-faint">· {hint}</span>}
      </span>
      {children}
    </label>
  );
}
