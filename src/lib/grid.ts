import type { VerificationRun, TestResult } from "@/lib/db";

// The Grid — every verification run compiles into one rigid, text-native
// share artifact (the Wordle-grid principle: recognizable in a feed at half
// attention, pastes into any chat app as plain text). The format never
// varies; the community memes on top of a stable canvas.
//
//   poolproof · wordle-solver · run #7
//   🟩🟩🟩🟩🟩🟩  public 6/6
//   🟩🟩💀  hidden — died at holdout #3
//   RED — nothing moved · @kimdev
//   poolproof.dev/p/wordle-solver
//
// Rules encoded here, not in the caller:
// - public row: 🟩 pass · 🟥 fail
// - hidden row: 🟩 pass · 💀 fail — holdout *names* are never exposed, only
//   their squares. The visible-but-unreadable row IS the brand.
// - verdict line always states whether money moved.

export interface GridCell {
  kind: "public" | "holdout";
  pass: boolean;
}

export interface RunGrid {
  slug: string;
  runId: number;
  green: boolean;
  builder: string;
  publicCells: GridCell[];
  holdoutCells: GridCell[];
  /** 1-based index of the first failed holdout, if any */
  diedAtHoldout: number | null;
  text: string;
}

const SITE = "poolproof.dev";

export function buildRunGrid(
  slug: string,
  run: VerificationRun,
  results: TestResult[],
  builder: string
): RunGrid {
  const publicCells: GridCell[] = [];
  const holdoutCells: GridCell[] = [];
  for (const r of results) {
    const cell: GridCell = { kind: r.kind, pass: r.status === "pass" };
    (r.kind === "public" ? publicCells : holdoutCells).push(cell);
  }
  const diedAt = holdoutCells.findIndex((c) => !c.pass);
  const diedAtHoldout = diedAt === -1 ? null : diedAt + 1;
  const green = run.status === "green";

  const publicRow = publicCells.map((c) => (c.pass ? "🟩" : "🟥")).join("");
  const holdoutRow = holdoutCells.map((c) => (c.pass ? "🟩" : "💀")).join("");
  const publicPassed = publicCells.filter((c) => c.pass).length;

  const lines = [`poolproof · ${slug} · run #${run.id}`];
  if (publicCells.length > 0) {
    lines.push(`${publicRow}  public ${publicPassed}/${publicCells.length}`);
  }
  if (holdoutCells.length > 0) {
    lines.push(
      diedAtHoldout === null
        ? `${holdoutRow}  hidden ${holdoutCells.length}/${holdoutCells.length}`
        : `${holdoutRow}  hidden — died at holdout #${diedAtHoldout}`
    );
  }
  lines.push(green ? `GREEN — money moved · @${builder}` : `RED — nothing moved · @${builder}`);
  lines.push(`${SITE}/p/${slug}`);

  return {
    slug,
    runId: run.id,
    green,
    builder,
    publicCells,
    holdoutCells,
    diedAtHoldout,
    text: lines.join("\n"),
  };
}
