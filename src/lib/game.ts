import { getReadyClient } from "./db";

// ---------- types ----------

export type Source = "human" | "ai";

/** An item as shown to the player — deliberately WITHOUT the answer. */
export interface PlayItem {
  id: number;
  domain: string;
  body: string;
}

/** An item after the reveal — answer key is now safe to expose. */
export interface RevealItem extends PlayItem {
  source: Source;
  model: string | null;
  note: string;
  guess: Source | null;
  ok: boolean;
}

export interface Play {
  day: string;
  player: string;
  display: string;
  correct: number;
  total: number;
  grid: string;
  created_at: string;
}

export interface LeaderRow {
  display: string;
  correct: number;
  total: number;
  grid: string;
}

interface ItemRow {
  id: number;
  domain: string;
  body: string;
  source: Source;
  model: string | null;
  note: string;
}

const DAILY_COUNT = 10;

// ---------- daily selection ----------
// The same day string must yield the same items in the same order for every
// player and for the grading pass, so scores and grids are comparable. Pure
// function of (day, pool) — no randomness.

/** UTC day key, e.g. "2026-07-12". */
export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** djb2 fold of a string → 32-bit seed. */
function seedOf(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) >>> 0;
  return h >>> 0;
}

/**
 * murmur3 finalizer — a strong 32-bit avalanche. A weak hash (plain djb2 of
 * `day:id`) barely reorders the pool day to day, so the same handful of items
 * always sort to the top and any positional pattern is learnable. This mixes
 * hard, so each day looks independent.
 */
function mix32(x: number): number {
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b);
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35);
  return (x ^ (x >>> 16)) >>> 0;
}

/** Deterministic per-(day, id) key. `salt` gives independent orderings. */
function dayKey(daySeed: number, id: number, salt: number): number {
  return mix32((daySeed ^ Math.imul(id, 0x9e3779b1) ^ Math.imul(salt, 0x27d4eb2f)) >>> 0);
}

async function pickDailyRows(day: string): Promise<ItemRow[]> {
  const c = await getReadyClient();
  const res = await c.execute("SELECT id, domain, body, source, model, note FROM game_items");
  const seed = seedOf(day);
  const keyed = (res.rows as unknown as ItemRow[])
    .map((r) => ({ r, sel: dayKey(seed, r.id, 0), ord: dayKey(seed, r.id, 1) }))
    .sort((a, b) => a.sel - b.sel || a.r.id - b.r.id);

  // Balance the day: exactly half human, half AI, so every player faces the
  // same fair split and a high score means real discrimination, not a lucky
  // lopsided draw. Deterministic per day, no randomness.
  const HALF = DAILY_COUNT / 2;
  const humans = keyed.filter((x) => x.r.source === "human").slice(0, HALF);
  const ais = keyed.filter((x) => x.r.source === "ai").slice(0, HALF);
  const chosen = [...humans, ...ais];

  // Backfill from whatever's left if one source is short, so the count stays
  // stable even on a small pool.
  if (chosen.length < DAILY_COUNT) {
    const have = new Set(chosen.map((x) => x.r.id));
    for (const x of keyed) {
      if (chosen.length >= DAILY_COUNT) break;
      if (!have.has(x.r.id)) chosen.push(x);
    }
  }

  // Present in an order keyed independently of selection (salt 1), so the 5/5
  // split can't be read off the positions.
  return chosen.sort((a, b) => a.ord - b.ord || a.r.id - b.r.id).map((x) => x.r);
}

/** Today's items with the answer stripped — safe to send to the client. */
export async function getPlayItems(day: string): Promise<PlayItem[]> {
  const rows = await pickDailyRows(day);
  return rows.map(({ id, domain, body }) => ({ id, domain, body }));
}

// ---------- plays ----------

export async function getMyPlay(day: string, player: string): Promise<Play | undefined> {
  const c = await getReadyClient();
  const res = await c.execute({
    sql: "SELECT day, player, display, correct, total, grid, created_at FROM game_plays WHERE day = ? AND player = ?",
    args: [day, player],
  });
  return res.rows[0] as unknown as Play | undefined;
}

function buildGrid(marks: boolean[]): string {
  return marks.map((ok) => (ok ? "🟩" : "🟥")).join("");
}

export interface GradeResult {
  correct: number;
  total: number;
  grid: string;
  reveal: RevealItem[];
  alreadyPlayed: boolean;
}

/** Answer key for a day with no per-item guess marks (revisit recap). */
function answersOnly(rows: ItemRow[]): RevealItem[] {
  return rows.map((r) => ({
    id: r.id,
    domain: r.domain,
    body: r.body,
    source: r.source,
    model: r.model,
    note: r.note,
    guess: null,
    ok: false,
  }));
}

/** Reveal (answers only) for a player revisiting after they already played. */
export async function getReveal(day: string): Promise<RevealItem[]> {
  return answersOnly(await pickDailyRows(day));
}

/**
 * Grade a set of guesses against the server-side answer key and record the play.
 * One play per (day, player): if a play already exists the first result stands
 * (returned unchanged), so scores can't be farmed by replaying.
 */
export async function gradeAndRecord(
  day: string,
  player: string,
  display: string,
  guesses: Record<number, Source>
): Promise<GradeResult> {
  const rows = await pickDailyRows(day);
  const c = await getReadyClient();

  const prior = await getMyPlay(day, player);
  if (prior) {
    return {
      correct: prior.correct,
      total: prior.total,
      grid: prior.grid,
      reveal: answersOnly(rows),
      alreadyPlayed: true,
    };
  }

  const reveal: RevealItem[] = rows.map((r) => {
    const guess = guesses[r.id] ?? null;
    return { id: r.id, domain: r.domain, body: r.body, source: r.source, model: r.model, note: r.note, guess, ok: guess === r.source };
  });
  const marks = reveal.map((r) => r.ok);
  const correct = marks.filter(Boolean).length;
  const total = rows.length;
  const grid = buildGrid(marks);

  await c.execute({
    sql: `INSERT INTO game_plays (day, player, display, correct, total, grid)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(day, player) DO NOTHING`,
    args: [day, player, display, correct, total, grid],
  });

  return { correct, total, grid, reveal, alreadyPlayed: false };
}

// ---------- leaderboard / stats ----------

export async function getLeaderboard(day: string, limit = 20): Promise<LeaderRow[]> {
  const c = await getReadyClient();
  const res = await c.execute({
    sql: `SELECT display, correct, total, grid FROM game_plays
          WHERE day = ? ORDER BY correct DESC, created_at ASC LIMIT ?`,
    args: [day, limit],
  });
  return res.rows as unknown as LeaderRow[];
}

export async function getDayStats(day: string): Promise<{ players: number; avg: number }> {
  const c = await getReadyClient();
  const res = await c.execute({
    sql: "SELECT COUNT(*) AS players, COALESCE(AVG(correct), 0) AS avg FROM game_plays WHERE day = ?",
    args: [day],
  });
  const row = res.rows[0] as unknown as { players: number; avg: number };
  return { players: Number(row.players), avg: Number(row.avg) };
}
