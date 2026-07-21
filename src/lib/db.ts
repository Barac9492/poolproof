import { createClient, type Client, type InStatement, type Transaction } from "@libsql/client";
import path from "path";
import crypto from "node:crypto";
import { generateAiCounterpart } from "./ai";
import { SLOT_STAKE_RATIO } from "./economy";

// ---------- types ----------

export type ProjectStatus = "funding" | "open" | "building" | "green" | "refunded";

/** escrow = pay-on-green pool; arena = 콜로세움 spectacle frame (ticket/prize, no finance widgets) */
export type ProjectMode = "escrow" | "arena";

export interface Project {
  id: number;
  slug: string;
  title: string;
  summary: string;
  source_label: string;
  source_url: string;
  category: string;
  spec_author: string;
  goal_credits: number;
  escrowed_credits: number;
  status: ProjectStatus;
  mode: ProjectMode;
  deadline_at: string | null;
  suite_ready: number;
  is_demo: number;
  created_at: string;
}

export interface ContractCard {
  project_id: number;
  you_get: string[];
  you_dont_get: string[];
}

export interface AcceptanceTest {
  id: number;
  project_id: number;
  name: string;
  kind: "public" | "holdout";
}

export interface Pledge {
  id: number;
  project_id: number;
  backer: string;
  amount: number;
  status: "escrowed" | "paid_out" | "refunded";
  created_at: string;
}

export interface Slot {
  id: number;
  project_id: number;
  builder: string;
  stake: number;
  status: "active" | "succeeded" | "failed";
  expires_at: string | null;
  created_at: string;
}

export interface VerificationRun {
  id: number;
  project_id: number;
  slot_id: number;
  submission: string;
  status: "green" | "red";
  passed: number;
  failed: number;
  created_at: string;
}

export interface TestResult {
  id: number;
  run_id: number;
  name: string;
  kind: "public" | "holdout";
  status: "pass" | "fail";
  detail: string | null;
}

export type LedgerType =
  | "pledge"
  | "stake"
  | "status"
  | "run"
  | "payout"
  | "annuity"
  | "spec_fee"
  | "platform_fee"
  | "refund"
  | "stake_return"
  | "stake_burn";

export interface LedgerEntry {
  id: number;
  project_id: number;
  type: LedgerType;
  description: string;
  amount: number;
  actor: string;
  created_at: string;
}

export interface Comment {
  id: number;
  project_id: number;
  handle: string;
  body: string;
  created_at: string;
}

export const SPLIT = {
  builder: 0.74,
  annuity: 0.15,
  spec_author: 0.03,
  platform: 0.08,
} as const;

// ---------- client ----------
// One SQLite dialect everywhere: local file in dev, Turso (libsql://) in prod.
// TURSO_DATABASE_URL + TURSO_AUTH_TOKEN switch persistence on without any SQL changes.

export type DbBackend = "turso" | "ephemeral" | "local";

/** Which persistence layer is actually in use — surfaced by /api/health. */
export function dbBackend(): DbBackend {
  if (process.env.TURSO_DATABASE_URL) return "turso";
  if (process.env.VERCEL) return "ephemeral";
  return "local";
}

let _ephemeralWarned = false;

function dbUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL) {
    // Financial state must never fall back to a disposable serverless file.
    // Fail closed so a missing Turso binding is immediately visible instead of
    // accepting pledges that disappear on the next cold start.
    if (!_ephemeralWarned) {
      _ephemeralWarned = true;
      console.error("[poolproof] durable Turso storage is required on Vercel");
    }
    throw new Error("TURSO_DATABASE_URL is required on Vercel");
  }
  return `file:${path.join(process.cwd(), "poolproof.db")}`;
}

let _client: Client | null = null;
let _ready: Promise<void> | null = null;

function client(): Client {
  if (!_client) {
    _client = createClient({
      url: dbUrl(),
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

async function db(): Promise<Client> {
  if (!_ready) _ready = migrateAndSeed(client());
  await _ready;
  return client();
}

type Row = Record<string, unknown>;

async function all<T = Row>(sql: string, args: (string | number | null)[] = []): Promise<T[]> {
  const res = await (await db()).execute({ sql, args });
  return res.rows as unknown as T[];
}

async function one<T = Row>(sql: string, args: (string | number | null)[] = []): Promise<T | undefined> {
  const rows = await all<T>(sql, args);
  return rows[0];
}

async function run(sql: string, args: (string | number | null)[] = []): Promise<number> {
  const res = await (await db()).execute({ sql, args });
  return Number(res.lastInsertRowid ?? 0);
}

async function batch(statements: InStatement[]): Promise<void> {
  await (await db()).batch(statements, "write");
}

async function withWriteTransaction<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
  const tx = await (await db()).transaction("write");
  try {
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      // Preserve the original failure if rollback itself cannot complete.
    }
    throw error;
  } finally {
    tx.close();
  }
}

class MutationRejected extends Error {}

// ---------- migration ----------

const DDL = [
  `CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source_label TEXT NOT NULL DEFAULT '',
    source_url TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'devtools',
    spec_author TEXT NOT NULL DEFAULT 'anon',
    goal_credits INTEGER NOT NULL,
    escrowed_credits INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'funding' CHECK (status IN ('funding','open','building','green','refunded')),
    deadline_at TEXT,
    mode TEXT NOT NULL DEFAULT 'escrow',
    suite_ready INTEGER NOT NULL DEFAULT 0 CHECK (suite_ready IN (0, 1)),
    is_demo INTEGER NOT NULL DEFAULT 0 CHECK (is_demo IN (0, 1)),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS contract_cards (
    project_id INTEGER PRIMARY KEY REFERENCES projects(id),
    you_get TEXT NOT NULL,
    you_dont_get TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS acceptance_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'public' CHECK (kind IN ('public','holdout'))
  )`,
  `CREATE TABLE IF NOT EXISTS pledges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    backer TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'escrowed' CHECK (status IN ('escrowed','paid_out','refunded')),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    builder TEXT NOT NULL,
    stake INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','succeeded','failed')),
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS verification_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    slot_id INTEGER NOT NULL REFERENCES slots(id),
    submission TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('green','red')),
    passed INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES verification_runs(id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('public','holdout')),
    status TEXT NOT NULL CHECK (status IN ('pass','fail')),
    detail TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS ledger (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    type TEXT NOT NULL,
    description TEXT NOT NULL,
    amount INTEGER NOT NULL DEFAULT 0,
    actor TEXT NOT NULL DEFAULT 'system',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ledger_project ON ledger(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_pledges_project ON pledges(project_id)`,
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    handle TEXT NOT NULL UNIQUE COLLATE NOCASE,
    pw_hash TEXT NOT NULL,
    credits INTEGER NOT NULL DEFAULT 500 CHECK (credits >= 0),
    email TEXT,
    name TEXT,
    avatar_url TEXT,
    google_sub TEXT,
    github_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS handle_reservations (
    handle TEXT PRIMARY KEY COLLATE NOCASE,
    kind TEXT NOT NULL,
    user_id INTEGER REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TRIGGER IF NOT EXISTS users_handle_immutable
    BEFORE UPDATE OF handle ON users
    WHEN NEW.handle <> OLD.handle
    BEGIN SELECT RAISE(ABORT, 'account handles are immutable'); END`,
  `CREATE TRIGGER IF NOT EXISTS users_no_delete
    BEFORE DELETE ON users
    BEGIN SELECT RAISE(ABORT, 'accounts must be tombstoned, not deleted'); END`,
  `CREATE TABLE IF NOT EXISTS votes (
    project_id INTEGER NOT NULL REFERENCES projects(id),
    handle TEXT NOT NULL COLLATE NOCASE,
    dir INTEGER NOT NULL CHECK (dir IN (1, -1)),
    PRIMARY KEY (project_id, handle)
  )`,
  `CREATE TABLE IF NOT EXISTS watches (
    project_id INTEGER NOT NULL REFERENCES projects(id),
    handle TEXT NOT NULL COLLATE NOCASE,
    PRIMARY KEY (project_id, handle)
  )`,
  `CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    handle TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_comments_project ON comments(project_id)`,
  // ---- 판별 게임 (human-vs-AI text detection): a pool of items whose ground
  // truth (source) is known by construction. `source` never leaves the server. ----
  `CREATE TABLE IF NOT EXISTS game_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    body TEXT NOT NULL,
    source TEXT NOT NULL,
    model TEXT,
    note TEXT NOT NULL DEFAULT '',
    author TEXT,
    prompt TEXT,
    submission_id INTEGER REFERENCES submissions(id)
  )`,
  `CREATE TABLE IF NOT EXISTS game_plays (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    player TEXT NOT NULL,
    display TEXT NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    grid TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_game_plays_unique ON game_plays(day, player)`,
  `CREATE INDEX IF NOT EXISTS idx_game_plays_day ON game_plays(day)`,
  // body is the natural key for the curated pool, so new items can be topped up
  // idempotently (ON CONFLICT(body)) without duplicating what's already seeded.
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_game_items_body ON game_items(body)`,
  // ---- supply loop: creative challenges players answer, whose submissions
  // (human) get paired against an AI counterpart and served to others. ----
  `CREATE TABLE IF NOT EXISTS challenge_prompts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    prompt TEXT NOT NULL,
    ai_answer TEXT,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    prompt_id INTEGER NOT NULL REFERENCES challenge_prompts(id),
    author TEXT NOT NULL,
    body TEXT NOT NULL,
    ai_body TEXT NOT NULL DEFAULT '',
    ai_model TEXT,
    owns INTEGER NOT NULL DEFAULT 0,
    no_ai INTEGER NOT NULL DEFAULT 0 CHECK (no_ai IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status)`,
  `CREATE INDEX IF NOT EXISTS idx_submissions_author ON submissions(author)`,
  // ---- 원샷 챌린지: one prompt, one generation, one run. The prompt is the
  // submission; the generated code and its holdout verdict are the record. ----
  `CREATE TABLE IF NOT EXISTS oneshot_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL,
    player TEXT NOT NULL,
    display TEXT NOT NULL,
    prompt TEXT NOT NULL,
    model TEXT NOT NULL,
    code TEXT NOT NULL,
    public_pass INTEGER NOT NULL,
    public_total INTEGER NOT NULL,
    holdout_pass INTEGER NOT NULL,
    holdout_total INTEGER NOT NULL,
    green INTEGER NOT NULL,
    died_at INTEGER,
    detail TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE INDEX IF NOT EXISTS idx_oneshot_slug ON oneshot_runs(slug)`,
  `CREATE INDEX IF NOT EXISTS idx_oneshot_player ON oneshot_runs(player)`,
  `CREATE TABLE IF NOT EXISTS oneshot_attempts (
    attempt_id TEXT NOT NULL UNIQUE,
    day TEXT NOT NULL,
    slug TEXT NOT NULL,
    player TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'claimed' CHECK (status IN ('claimed','spent','completed')),
    run_id INTEGER REFERENCES oneshot_runs(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (day, slug, player)
  )`,
  `CREATE TABLE IF NOT EXISTS polar_fulfillments (
    order_id TEXT PRIMARY KEY,
    handle TEXT NOT NULL,
    credits INTEGER NOT NULL,
    fulfilled_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS pledge_requests (
    request_id TEXT PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    backer TEXT NOT NULL,
    amount INTEGER NOT NULL,
    pledge_id INTEGER REFERENCES pledges(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS system_accounts (
    account TEXT PRIMARY KEY,
    credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0)
  )`,
  `CREATE TABLE IF NOT EXISTS oneshot_rewards (
    run_id INTEGER PRIMARY KEY REFERENCES oneshot_runs(id),
    handle TEXT NOT NULL,
    credits INTEGER NOT NULL CHECK (credits > 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
];

async function addColumnIfMissing(
  c: Client,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  if (!/^[a-z_]+$/.test(table) || !/^[a-z_]+$/.test(column)) throw new Error("invalid migration identifier");
  const hasColumn = async () => {
    const info = await c.execute(`PRAGMA table_info(${table})`);
    return info.rows.some((row) => String(row.name) === column);
  };
  if (await hasColumn()) return;
  try {
    await c.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (error) {
    // A concurrent cold start may have satisfied the exact postcondition after
    // our first read. Suppress only that confirmed race; surface every real error.
    if (await hasColumn()) return;
    throw error;
  }
}

type SeedExecutor = Pick<Transaction, "execute" | "batch">;

/** Check and seed inside one write transaction. A crash rolls back both the
 * rows and completion marker, so the next cold start can safely retry. */
async function seedIfEmpty(
  c: Client,
  key: string,
  table: string,
  seedFn: (tx: SeedExecutor) => Promise<void>
): Promise<void> {
  if (!/^[a-z_]+$/.test(table)) throw new Error("invalid seed table");
  const tx = await c.transaction("write");
  try {
    const count = await tx.execute(`SELECT COUNT(*) AS n FROM ${table}`);
    if (Number(count.rows[0].n) === 0) await seedFn(tx);
    await tx.execute({
      sql: "INSERT INTO meta (key, value) VALUES (?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
      args: [key],
    });
    await tx.commit();
  } catch (error) {
    try {
      await tx.rollback();
    } catch {}
    throw error;
  } finally {
    tx.close();
  }
}

async function runMigrationOnce(
  c: Client,
  key: string,
  work: (tx: SeedExecutor) => Promise<void>
): Promise<void> {
  const tx = await c.transaction("write");
  try {
    const claimed = await tx.execute({
      sql: "INSERT INTO meta (key, value) VALUES (?, datetime('now')) ON CONFLICT(key) DO NOTHING",
      args: [key],
    });
    if (Number(claimed.rowsAffected ?? 0) === 1) await work(tx);
    await tx.commit();
  } catch (error) {
    try {
      await tx.rollback();
    } catch {}
    throw error;
  } finally {
    tx.close();
  }
}

async function migrateAndSeed(c: Client): Promise<void> {
  // Local SQLite retains this connection pragma. Turso may route separate
  // execute calls to different logical sessions, so financial invariants also
  // enforce every parent/recipient explicitly inside their write transaction.
  await c.execute("PRAGMA foreign_keys = ON");
  await c.batch(DDL, "write");

  // Explicit, introspected additive migrations for existing Turso databases.
  await addColumnIfMissing(c, "users", "credits", "INTEGER NOT NULL DEFAULT 500");
  await addColumnIfMissing(c, "users", "email", "TEXT");
  await addColumnIfMissing(c, "users", "name", "TEXT");
  await addColumnIfMissing(c, "users", "avatar_url", "TEXT");
  await addColumnIfMissing(c, "users", "google_sub", "TEXT");
  await addColumnIfMissing(c, "users", "github_id", "TEXT");
  await addColumnIfMissing(c, "projects", "deadline_at", "TEXT");
  await addColumnIfMissing(c, "projects", "mode", "TEXT NOT NULL DEFAULT 'escrow'");
  await addColumnIfMissing(c, "projects", "suite_ready", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(c, "projects", "is_demo", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(c, "slots", "expires_at", "TEXT");
  await addColumnIfMissing(c, "game_items", "author", "TEXT");
  await addColumnIfMissing(c, "game_items", "prompt", "TEXT");
  await addColumnIfMissing(c, "game_items", "submission_id", "INTEGER");
  await addColumnIfMissing(c, "submissions", "no_ai", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(c, "oneshot_attempts", "attempt_id", "TEXT");
  await addColumnIfMissing(c, "oneshot_attempts", "status", "TEXT NOT NULL DEFAULT 'claimed'");
  await addColumnIfMissing(c, "oneshot_attempts", "run_id", "INTEGER");
  await addColumnIfMissing(c, "pledge_requests", "amount", "INTEGER NOT NULL DEFAULT 0");
  await addColumnIfMissing(c, "pledge_requests", "pledge_id", "INTEGER");
  await c.execute(
    "UPDATE oneshot_attempts SET attempt_id = lower(hex(randomblob(16))) WHERE attempt_id IS NULL OR attempt_id = ''"
  );
  await c.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_oneshot_attempt_id ON oneshot_attempts(attempt_id)"
  );
  await c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_sub) WHERE google_sub IS NOT NULL");
  await c.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github ON users(github_id) WHERE github_id IS NOT NULL");
  await c.execute(
    "CREATE INDEX IF NOT EXISTS idx_projects_deadline_live ON projects(deadline_at) WHERE status IN ('funding','open','building')"
  );
  await c.execute("CREATE INDEX IF NOT EXISTS idx_slots_expiry_active ON slots(expires_at) WHERE status = 'active'");

  // Apply source readiness and demo segregation once. Demo classification uses
  // the complete founding-row fingerprint, never a mutable slug alone.
  await runMigrationOnce(c, "migration:founding-pools-v1", async (tx) => {
    // Revoke legacy slug-only approvals. A live pool needs an explicit,
    // versioned approval; sharing a source slug is never sufficient authority.
    await tx.execute(
      `UPDATE projects SET suite_ready = 0
       WHERE is_demo = 0
         AND slug IN ('markdown-alerts','iso-duration','slugify-korean','josa','wordle-solver')`
    );
    await tx.execute(
      `UPDATE projects SET is_demo = 1, suite_ready = 1
       WHERE (slug = 'markdown-alerts' AND goal_credits = 2400
              AND spec_author = 'spec-guild/mira'
              AND source_url = 'https://github.com/orgs/community/discussions/16925')
          OR (slug = 'iso-duration' AND goal_credits = 3200
              AND spec_author = 'spec-guild/tomasz'
              AND source_url = 'https://github.com/date-fns/date-fns/issues/2261')
          OR (slug = 'slugify-korean' AND goal_credits = 1800
              AND spec_author = 'ethan'
              AND source_url = 'https://github.com/simov/slugify/issues')`
    );

    const revokedSlots = await tx.execute(
      `SELECT slots.* FROM slots JOIN projects ON projects.id = slots.project_id
       WHERE slots.status = 'active' AND projects.is_demo = 0 AND projects.suite_ready = 0
         AND projects.slug IN ('markdown-alerts','iso-duration','slugify-korean','josa','wordle-solver')`
    );
    for (const raw of revokedSlots.rows) {
      const slot = raw as unknown as Slot;
      const closed = await tx.execute({
        sql: "UPDATE slots SET status = 'failed' WHERE id = ? AND status = 'active'",
        args: [slot.id],
      });
      if (Number(closed.rowsAffected ?? 0) !== 1) throw new Error("revoked-suite slot reconciliation race");
      const credited = await tx.execute({
        sql: "UPDATE users SET credits = credits + ? WHERE handle = ? COLLATE NOCASE",
        args: [slot.stake, slot.builder],
      });
      if (Number(credited.rowsAffected ?? 0) !== 1) throw new Error("revoked-suite slot recipient not found");
      await tx.batch([
        {
          sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'stake_return', ?, ?, ?)",
          args: [slot.project_id, `Stake returned because suite approval was revoked for ${slot.builder}`, -slot.stake, slot.builder],
        },
        {
          sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', 'Suite approval revoked — slot closed without penalty', 0, 'system')",
          args: [slot.project_id],
        },
      ]);
    }
    await tx.execute(
      `UPDATE projects SET status = 'funding'
       WHERE is_demo = 0 AND suite_ready = 0 AND status IN ('open','building')
         AND slug IN ('markdown-alerts','iso-duration','slugify-korean','josa','wordle-solver')`
    );
    await tx.execute("UPDATE projects SET mode = 'escrow' WHERE slug = 'wordle-solver' AND is_demo = 1");
    await tx.execute({
      sql: `UPDATE projects SET summary = ?, source_label = ?
            WHERE slug = 'wordle-solver' AND is_demo = 1`,
      args: [
        "Can an AI build a Wordle solver that survives a real unseen test run? nextGuess(history, words) must solve hidden words in ≤6 using only g/y/b feedback. Public tests define the contract; the private suite rotates across trap families and repeated-letter cases, so memorizing fixed answers does not prove a solver.",
        "Rotating private answer families: public tests show the contract, production holdouts stay outside the repository",
      ],
    });
    await tx.execute({
      sql: `UPDATE contract_cards SET you_get = ?
            WHERE project_id = (SELECT id FROM projects WHERE slug = 'wordle-solver' AND is_demo = 1)`,
      args: [
        JSON.stringify([
          "A JS module exporting nextGuess(history, words) that solves any answer in ≤6",
          "Passes a rotating private holdout suite without relying on fixed answer cases",
          "MIT-licensed source + public test suite + permanent verification result",
        ]),
      ],
    });
  });

  // Redact retired holdout-family copy from the original live Wordle contract
  // without changing its ownership, funding state, or suite approval.
  await runMigrationOnce(c, "migration:wordle-contract-redaction-v2", async (tx) => {
    await tx.execute({
      sql: `UPDATE contract_cards SET you_get = ?
            WHERE project_id = (
              SELECT id FROM projects
              WHERE slug = 'wordle-solver' AND spec_author = 'barac9492' AND goal_credits = 1500
            )`,
      args: [
        JSON.stringify([
          "A JS module exporting nextGuess(history, words) that solves answers in ≤6",
          "Passes a rotating private holdout suite without relying on fixed answer cases",
          "MIT-licensed source + public test suite + permanent verification result",
        ]),
      ],
    });
  });

  // Legacy check-then-write claims could leave more than one active slot. Keep
  // the oldest, close every duplicate, and return live user stakes before the
  // unique partial index is created. Demo stakes are synthetic ledger only.
  await runMigrationOnce(c, "migration:dedupe-active-slots-v1", async (tx) => {
    const duplicateProjects = await tx.execute(
      `SELECT project_id FROM slots WHERE status = 'active'
       GROUP BY project_id HAVING COUNT(*) > 1`
    );
    for (const duplicate of duplicateProjects.rows) {
      const projectId = Number(duplicate.project_id);
      const activeSlots = await tx.execute({
        sql: `SELECT slots.*, projects.is_demo FROM slots
              JOIN projects ON projects.id = slots.project_id
              WHERE slots.project_id = ? AND slots.status = 'active'
              ORDER BY slots.id ASC`,
        args: [projectId],
      });
      for (const raw of activeSlots.rows.slice(1)) {
        const extra = raw as unknown as Slot & { is_demo: number };
        const closed = await tx.execute({
          sql: "UPDATE slots SET status = 'failed' WHERE id = ? AND status = 'active'",
          args: [extra.id],
        });
        if (Number(closed.rowsAffected ?? 0) !== 1) throw new Error("duplicate slot reconciliation race");
        if (Number(extra.is_demo) === 0) {
          const credited = await tx.execute({
            sql: "UPDATE users SET credits = credits + ? WHERE handle = ? COLLATE NOCASE",
            args: [extra.stake, extra.builder],
          });
          if (Number(credited.rowsAffected ?? 0) !== 1) {
            throw new Error("duplicate slot recipient not found");
          }
        }
        await tx.execute({
          sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'stake_return', ?, ?, ?)",
          args: [
            projectId,
            Number(extra.is_demo) === 1
              ? `Synthetic duplicate slot retired for ${extra.builder}`
              : `Legacy duplicate slot stake returned to ${extra.builder}`,
            -Number(extra.stake),
            extra.builder,
          ],
        });
      }
    }
  });
  await c.execute(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_slots_one_active ON slots(project_id) WHERE status = 'active'"
  );

  // Persist every live, demo, system, and legacy-admin identity. Handles are
  // immutable public account identifiers and are never recycled.
  await c.execute(
    `INSERT OR IGNORE INTO handle_reservations (handle, kind, user_id)
     SELECT handle, 'user', id FROM users`
  );
  await c.execute(
    `INSERT OR IGNORE INTO handle_reservations (handle, kind)
     SELECT handle, 'demo' FROM (
       SELECT spec_author AS handle FROM projects WHERE is_demo = 1
       UNION SELECT backer FROM pledges JOIN projects ON projects.id = pledges.project_id WHERE projects.is_demo = 1
       UNION SELECT builder FROM slots JOIN projects ON projects.id = slots.project_id WHERE projects.is_demo = 1
     ) WHERE handle IS NOT NULL AND handle <> ''`
  );
  for (const handle of ["system", "poolproof", "ci-runner", "annuity-reserve", "maintenance-reserve"]) {
    await c.execute({
      sql: "INSERT OR IGNORE INTO handle_reservations (handle, kind) VALUES (?, 'system')",
      args: [handle],
    });
  }
  if (process.env.ADMIN_HANDLE?.trim()) {
    await c.execute({
      sql: "INSERT OR IGNORE INTO handle_reservations (handle, kind) VALUES (?, 'admin')",
      args: [process.env.ADMIN_HANDLE.trim()],
    });
  }
  await c.execute(
    "UPDATE projects SET deadline_at = datetime(created_at, '+30 days') WHERE deadline_at IS NULL AND status NOT IN ('green','refunded')"
  );
  await c.execute(
    "UPDATE slots SET expires_at = datetime(created_at, '+7 days') WHERE expires_at IS NULL AND status = 'active'"
  );
  await c.execute(
    `UPDATE projects SET status = 'open'
     WHERE status = 'funding' AND escrowed_credits >= goal_credits AND suite_ready = 1
       AND is_demo = 0 AND deadline_at > datetime('now')`
  );
  // Preserve completed attempts when the atomic claim table is first deployed.
  await c.execute(
    `INSERT OR IGNORE INTO oneshot_attempts
       (attempt_id, day, slug, player, status, run_id, created_at)
     SELECT lower(hex(randomblob(16))), date(created_at), slug, player, 'completed', id, created_at
     FROM oneshot_runs`
  );
  await c.execute(
    `UPDATE oneshot_attempts SET
       status = 'completed',
       run_id = (
         SELECT MAX(r.id) FROM oneshot_runs r
         WHERE date(r.created_at) = oneshot_attempts.day
           AND r.slug = oneshot_attempts.slug AND r.player = oneshot_attempts.player
       )
     WHERE EXISTS (
       SELECT 1 FROM oneshot_runs r
       WHERE date(r.created_at) = oneshot_attempts.day
         AND r.slug = oneshot_attempts.slug AND r.player = oneshot_attempts.player
     )`
  );

  await topUpGameItems(c);
  await seedIfEmpty(c, "seed:challenges_v2", "challenge_prompts", seedChallenges);
  await seedIfEmpty(c, "seed:projects_v2", "projects", seed);
  await c.execute(
    `INSERT OR IGNORE INTO handle_reservations (handle, kind)
     SELECT handle, 'demo' FROM (
       SELECT spec_author AS handle FROM projects WHERE is_demo = 1
       UNION SELECT backer FROM pledges JOIN projects ON projects.id = pledges.project_id WHERE projects.is_demo = 1
       UNION SELECT builder FROM slots JOIN projects ON projects.id = slots.project_id WHERE projects.is_demo = 1
     ) WHERE handle IS NOT NULL AND handle <> ''`
  );

  const orphaned = await c.execute("PRAGMA foreign_key_check");
  if (orphaned.rows.length > 0) throw new Error("database foreign-key check failed");
}

/** The ready client (migration guaranteed) for sibling data modules like game.ts. */
export async function getReadyClient(): Promise<Client> {
  return db();
}

// ---------- seed: 판별 게임 item pool ----------
// Every label is ground truth by construction — these were authored/labelled at
// publish time, so the game grades against an answer key, not a flaky detector.

async function topUpGameItems(c: Client): Promise<void> {
  // Idempotent: insert the full curated pool every boot, skipping anything whose
  // body is already present (ON CONFLICT(body)). New items land on the next
  // deploy — including on production DBs seeded before the pool grew — without
  // ever duplicating or wiping existing rows.

  // [domain, body, source, model, tell]
  const items: [string, string, "human" | "ai", string | null, string][] = [
    // ---- 사람이 쓴 것 (개인적·구체적·불완전) ----
    ["리뷰", "3만원 주고 샀는데 배터리 반나절도 안 감. 근데 디자인은 진짜 예뻐서 못 버리겠음ㅋㅋ 별 3개.", "human", null, "단점을 말하면서도 못 버리는 양가감정, 구어체와 ㅋㅋ. AI는 이런 모순된 감정을 잘 안 만듦."],
    ["SNS", "아 오늘 지하철에서 앞사람 이어폰 소리 다 새서 무슨 노래 듣는지 다 알아버림... 아이유였음", "human", null, "목적 없는 사소한 일상 관찰. AI는 이런 무쓸모 디테일을 잘 생성하지 않음."],
    ["에세이", "스무 살 자취방 곰팡이 냄새를 아직도 기억한다. 그땐 서러웠는데 지금은 그리운 걸 보면, 사람은 결국 다 미화하나 보다.", "human", null, "특정 감각 기억 + 개인적 결론, 문장 리듬이 불규칙함."],
    ["Q&A", "그거 그냥 재부팅하면 됨. 나도 어제 같은 거 뜨길래 껐다 켰더니 사라졌음.", "human", null, "본인 경험 기반 즉답, 짧고 무성의한 실전 톤."],
    ["리뷰", "사장님이 서비스로 계란찜 주심. 맛은 그냥 그랬는데 정 때문에 또 가게 됨.", "human", null, "비논리적 재방문 이유(정). 감정이 논리를 이김 — 사람다움."],
    ["SNS", "회의 3시간 했는데 결론이 '다음에 다시 얘기하자'였음. 내 인생.", "human", null, "자조적 과장, 사람 특유의 체념 유머."],
    ["에세이", "글쓰기는 재능이 아니라 엉덩이라고 누가 그랬는데, 요즘은 그 엉덩이도 재능인 것 같다.", "human", null, "인용을 비틀어 자기 견해로. 말장난과 개인적 결론."],
    ["Q&A", "환불은 앱에서 안 되고 고객센터 전화해야 됨. 상담원 연결까지 20분 걸리니까 각오하셈.", "human", null, "짜증 섞인 구체적 실전 팁, 반말과 경고."],
    ["리뷰", "택배가 문 앞이 아니라 경비실로 갔는데 경비아저씨 퇴근하셔서 다음날 받음. 물건 자체는 만족.", "human", null, "제품과 무관한 배송 사고 일화 — 사람은 곁길로 샘."],
    ["SNS", "다이어트 3일차 치킨 시킴. 나 자신이 실망스럽지만 맛있음.", "human", null, "자기모순 고백 + 솔직한 만족. AI는 이런 자책+긍정 조합을 잘 안 함."],

    // ---- AI가 쓴 것 (균형·헤지·리스트·추상) ----
    ["리뷰", "이 제품은 뛰어난 디자인과 실용성을 겸비하고 있습니다. 다만 배터리 지속 시간은 다소 아쉬울 수 있습니다. 전반적으로 만족스러운 선택이 될 것입니다.", "ai", "GPT풍", "장단점 균형 나열 + '~수 있습니다' 헤지 + 감정 부재."],
    ["SNS", "오늘도 작은 행복을 발견하는 하루가 되었습니다. 여러분의 하루는 어떠셨나요? 😊", "ai", "GPT풍", "보편적 긍정 + 참여 유도 질문 + 이모지. 구체성 0."],
    ["에세이", "삶은 여정과 같습니다. 때로는 힘든 순간도 있지만, 그 안에서 우리는 성장하고 배워갑니다. 중요한 것은 포기하지 않는 마음입니다.", "ai", "GPT풍", "격언 나열, 추상명사, 누구에게나 맞는 말."],
    ["Q&A", "해당 오류는 여러 원인으로 발생할 수 있습니다. 첫째, 캐시를 삭제해 보세요. 둘째, 앱을 최신 버전으로 업데이트하세요. 셋째, 기기를 재시작해 보세요.", "ai", "GPT풍", "번호 매긴 망라형 리스트, 실제 경험 없음."],
    ["뉴스", "인공지능 기술의 발전은 우리 사회 전반에 큰 변화를 가져오고 있습니다. 전문가들은 이러한 변화가 앞으로도 지속될 것으로 전망하고 있습니다.", "ai", "GPT풍", "무출처 '전문가들', 구체적 사실 0, 일반론."],
    ["리뷰", "가성비가 훌륭한 제품입니다. 사용법도 간편하여 초보자에게 적합합니다. 강력히 추천드립니다!", "ai", "GPT풍", "상투어('가성비''강력 추천') 나열, 구체 사례 없음."],
    ["설명", "건강한 생활을 위해서는 균형 잡힌 식단과 규칙적인 운동이 중요합니다. 또한 충분한 수면과 스트레스 관리도 필수적입니다.", "ai", "GPT풍", "교과서적 나열, 반박 불가능한 뻔한 말."],
    ["SNS", "새로운 한 주가 시작되었습니다! 이번 주도 긍정적인 에너지로 가득 채워보세요. 화이팅! 💪", "ai", "GPT풍", "요일 인사 + 응원 + 이모지 공식."],
    ["Q&A", "좋은 질문입니다! 이 주제에 대해 설명드리겠습니다. 여러 가지 측면을 종합적으로 고려해야 하는데요, 하나씩 살펴보겠습니다.", "ai", "GPT풍", "'좋은 질문입니다' 메타 서두, 실질 내용 지연."],
    ["에세이", "독서는 마음의 양식이라고 합니다. 책을 통해 우리는 새로운 세계를 경험하고, 다양한 관점을 배울 수 있습니다.", "ai", "GPT풍", "속담 + 효용 나열, 개인 독서 경험 전무."],

    // ==== 2차 확장 풀 (사람) ====
    ["리뷰", "270 시켰는데 살짝 큼. 깔창 하나 깔면 딱임. 3주 신었는데 밑창 아직 멀쩡함.", "human", null, "실측 사이즈 + 임시방편 팁. 경험에서만 나오는 디테일."],
    ["SNS", "카페 옆자리 커플 헤어지는 중인데 나도 모르게 숨 참고 듣고 있었음... 미안", "human", null, "관음 + 죄책감 고백. 목적 없는 솔직함."],
    ["에세이", "엄마는 김치 담글 때마다 손맛 손맛 하시는데, 나는 아직도 그 손맛이 정확히 뭔지 모르겠다.", "human", null, "세대 간 감각 격차에 대한 개인적 미결 성찰."],
    ["Q&A", "그 식당 주차 지옥임. 근처 공영주차장 대고 5분 걸어가는 게 나음. 나 두 번 뺑뺑이 돌다 예약 놓칠 뻔.", "human", null, "구체적 실패담 기반 실전 조언."],
    ["리뷰", "색이 사진이랑 다름. 실물이 더 칙칙함. 근데 반품하기 귀찮아서 그냥 입는 중.", "human", null, "불만을 말하지만 귀찮음이 이김 — 사람다운 비합리."],
    ["SNS", "알람 7개 다 끄고 30분 더 잤는데 신기하게 안 늦음. 오늘 운수 좋은 날.", "human", null, "사소한 행운 자랑, 구체적 숫자(7개)."],
    ["에세이", "군대에서 배운 건 딱 하나, 아무리 힘들어도 시간은 간다는 것. 그게 위로가 될 때가 있다.", "human", null, "개인 경험에서 나온 냉소적 위안."],
    ["Q&A", "그 노트북 발열 진짜 심함. 쿨링패드 필수고 게임은 무리. 나는 문서작업용으로만 씀.", "human", null, "본인 사용 한계를 아는 경험적 답변."],
    ["리뷰", "배달 왔는데 단무지를 안 줌. 전화하니 다음에 두 개 준다고 하셔서 별 4개.", "human", null, "사소한 사건 + 인간적 타협으로 별점 결정."],
    ["SNS", "우산 안 가져왔는데 편의점 비닐우산 사기 애매해서 그냥 뛰었다. 다 젖음. 후회.", "human", null, "애매한 판단 → 후회 루프. 사람의 사후 자책."],
    ["에세이", "첫 월급으로 부모님 내복 사드렸다는 얘기, 나는 그 돈으로 그냥 치킨 시켜 먹었다. 죄송하지만 맛있었다.", "human", null, "클리셰를 비틀어 솔직하게. 죄책감 + 만족 동시."],
    ["Q&A", "as기간 지나면 유상수리인데 사설 가면 반값임. 나 액정 사설에서 갈았는데 아직 멀쩡하게 씀.", "human", null, "편법 실전 정보 + 본인 사례 검증."],
    ["리뷰", "향은 좋은데 지속력이 3시간쯤? 점심에 뿌리면 저녁엔 없음. 그래도 재구매 의사는 있음.", "human", null, "구체적 단점(3시간) + 그래도 재구매하는 모순."],
    ["SNS", "고양이가 새벽 4시에 얼굴 밟고 지나감. 잠 깼는데 화도 안 남. 이게 집사인가.", "human", null, "반려동물 일상 + 자조. 구체 시각(4시)."],
    ["에세이", "이사할 때마다 버리는 물건들을 보면, 내가 얼마나 많은 걸 필요 없이 사들였는지 알게 된다.", "human", null, "반복된 개인 경험에서 얻은 성찰."],
    ["Q&A", "회사 근처 국밥집 다 물어봤는데 그냥 김밥천국이 제일 안전함. 그게 진리임.", "human", null, "무성의하지만 확신에 찬 개인 결론."],
    ["리뷰", "포장 뜯을 때 테이프가 너무 많아서 짜증. 물건은 괜찮은데 여는 데 5분 걸림.", "human", null, "제품과 무관한 사소한 불만으로 곁길."],
    ["SNS", "친구가 결혼한다는데 축의금 얼마 해야 되나 30분째 고민 중. 이게 어른인가.", "human", null, "현실적 고민 + 자조적 정체성 질문."],
    ["에세이", "비 오는 날 부침개 생각나는 게 유전인가. 엄마도 그랬고 할머니도 그랬다는데.", "human", null, "개인 가족사 관찰, 답 없는 추측."],
    ["Q&A", "그 앱 결제 오류 나면 와이파이 끄고 데이터로 하면 됨. 나도 그렇게 뚫었음.", "human", null, "경험으로 찾은 우회 팁."],

    // ==== 2차 확장 풀 (AI) ====
    ["리뷰", "제품의 품질이 매우 우수하며 배송 또한 신속하게 이루어졌습니다. 다양한 상황에서 유용하게 사용할 수 있어 만족도가 높습니다.", "ai", "GPT풍", "무감정 완벽 만족, 구체 사례 없이 일반화."],
    ["SNS", "매일 조금씩 성장하는 자신을 발견하는 것은 정말 값진 경험입니다. 오늘 하루도 의미 있게 보내시길 바랍니다! ✨", "ai", "GPT풍", "성장 서사 + 축원 + 이모지 공식."],
    ["에세이", "행복은 멀리 있지 않습니다. 일상의 작은 순간들 속에서 우리는 진정한 기쁨을 발견할 수 있습니다.", "ai", "GPT풍", "반박 불가능한 격언, 개인 경험 0."],
    ["Q&A", "이 문제를 해결하기 위한 몇 가지 방법을 안내해 드리겠습니다. 우선 설정을 확인하시고, 필요한 경우 재설치를 진행해 보시기 바랍니다.", "ai", "GPT풍", "정중한 망라형 안내, 실경험 부재."],
    ["뉴스", "최근 경제 동향에 따르면 소비 심리가 점차 회복되고 있는 것으로 나타났습니다. 관계자들은 신중한 낙관론을 유지하고 있습니다.", "ai", "GPT풍", "무출처 '관계자' + '신중한 낙관' 헤지."],
    ["리뷰", "합리적인 가격대에 우수한 성능을 제공하는 제품입니다. 처음 사용하는 분들도 쉽게 적응할 수 있도록 직관적으로 설계되었습니다.", "ai", "GPT풍", "상투적 마케팅 문구 나열."],
    ["설명", "효과적인 시간 관리를 위해서는 우선순위를 명확히 하고, 계획을 세우며, 꾸준히 실천하는 것이 중요합니다.", "ai", "GPT풍", "교과서적 3단 나열, 뻔한 조언."],
    ["SNS", "따뜻한 봄날, 여러분의 마음에도 활짝 꽃이 피어나기를 바랍니다. 오늘도 행복한 하루 되세요! 🌸", "ai", "GPT풍", "계절 인사 + 축원 + 이모지 공식."],
    ["Q&A", "말씀하신 내용에 대해 도움을 드릴 수 있어 기쁩니다. 관련하여 몇 가지 고려해야 할 사항들을 정리해 보았습니다.", "ai", "GPT풍", "메타적 친절 서두, 실질 내용 지연."],
    ["에세이", "실패는 성공의 어머니라는 말이 있습니다. 우리는 실패를 통해 배우고 더 나은 방향으로 나아갈 수 있습니다.", "ai", "GPT풍", "속담 + 효용, 구체 실패담 없음."],
    ["리뷰", "전반적으로 만족스러운 구매였습니다. 몇 가지 개선점이 있긴 하지만 가격을 고려하면 충분히 납득할 만한 수준입니다.", "ai", "GPT풍", "균형 잡힌 헤지 결론, 개선점은 안 밝힘."],
    ["설명", "지속 가능한 환경을 위해 우리 모두의 작은 노력이 필요합니다. 일상 속 실천이 큰 변화를 만들어냅니다.", "ai", "GPT풍", "공익 캠페인 톤, 주체 없는 당위."],
    ["SNS", "새로운 도전을 앞두고 계신가요? 두려워하지 마세요. 모든 위대한 여정은 첫걸음에서 시작됩니다. 💪", "ai", "GPT풍", "동기부여 클리셰 + 유도 질문 + 이모지."],
    ["Q&A", "해당 사항은 상황에 따라 다를 수 있습니다. 정확한 답변을 위해서는 추가적인 정보가 필요할 수 있는 점 양해 부탁드립니다.", "ai", "GPT풍", "극도의 헤지로 실답 회피."],
    ["뉴스", "이번 정책은 다양한 이해관계자들에게 영향을 미칠 것으로 예상됩니다. 향후 추이를 지켜볼 필요가 있습니다.", "ai", "GPT풍", "내용 없는 전망 상투구."],
    ["에세이", "사랑은 주는 것에서 시작됩니다. 조건 없이 베풀 때 우리는 비로소 진정한 행복을 느낄 수 있습니다.", "ai", "GPT풍", "추상 명제의 단정, 개인 서사 없음."],
    ["리뷰", "디자인, 성능, 편의성 모두 만족스러운 제품입니다. 선물용으로도 훌륭한 선택이 될 것 같습니다. 추천합니다!", "ai", "GPT풍", "삼박자 나열 + 추천 마무리 공식."],
    ["설명", "건강한 인간관계를 위해서는 서로에 대한 존중과 이해, 그리고 원활한 소통이 무엇보다 중요합니다.", "ai", "GPT풍", "뻔한 관계론, 반박 불가 나열."],
    ["SNS", "한 해를 마무리하며 지난 시간을 돌아보는 것은 참 의미 있는 일입니다. 여러분은 어떤 한 해를 보내셨나요?", "ai", "GPT풍", "회고 유도 + 참여 질문 공식."],
    ["Q&A", "좋은 접근입니다. 다만 몇 가지 측면을 추가로 고려하신다면 더욱 완성도 높은 결과를 얻으실 수 있을 것입니다.", "ai", "GPT풍", "칭찬 + 개선 제안 정형구."],
  ];

  const stmts: InStatement[] = items.map(([domain, body, source, model, note]) => ({
    sql: `INSERT INTO game_items (domain, body, source, model, note) VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(body) DO NOTHING`,
    args: [domain, body, source, model, note],
  }));
  await c.batch(stmts, "write");
}

// ---------- seed: creative challenges players answer (supply loop) ----------
// ai_answer is the early-stage bank counterpart, used until ANTHROPIC_API_KEY
// is set (see lib/ai.ts). Kept generic/AI-flavored on purpose.

async function seedChallenges(c: SeedExecutor): Promise<void> {
  // [kind, prompt, bank AI answer]
  const prompts: [string, string, string][] = [
    ["삼행시", "'사랑'으로 삼행시를 지어주세요.", "사: 사람은 누구나 소중한 존재입니다.\n랑: 랑데부처럼 우리의 만남도 특별합니다.\n(각 줄이 설명적이고 교훈적 — AI 삼행시의 전형)"],
    ["삼행시", "'커피'로 삼행시를 지어주세요.", "커: 커다란 행복은 작은 것에서 시작됩니다.\n피: 피곤한 하루, 한 잔의 여유를 즐겨보세요."],
    ["카톡", "친구에게 약속을 갑자기 취소하는 카톡 메시지를 써주세요.", "안녕! 정말 미안한데 갑자기 사정이 생겨서 오늘 약속을 취소해야 할 것 같아. 다음에 꼭 다시 만나자. 이해해줘서 고마워!"],
    ["카톡", "택배가 안 왔을 때 판매자에게 문의하는 카톡 메시지를 써주세요.", "안녕하세요. 주문한 상품이 아직 도착하지 않아 문의드립니다. 배송 현황을 확인해 주시면 감사하겠습니다. 빠른 답변 부탁드립니다."],
    ["한줄평", "방금 본 영화에 대한 한 줄 평을 써주세요.", "감동과 재미를 모두 갖춘 작품으로, 많은 분들께 추천하고 싶은 영화입니다."],
    ["끝말잇기", "'바다'로 시작하는 짧은 문장을 만들어주세요.", "바다는 우리에게 무한한 영감과 평온함을 선사하는 소중한 자연입니다."],
    ["자기소개", "소개팅 자리에서 할 첫 자기소개 한두 문장을 써주세요.", "안녕하세요, 만나서 반갑습니다. 저는 긍정적이고 새로운 사람들과의 만남을 좋아하는 사람입니다."],
    ["댓글", "귀여운 강아지 영상에 달 댓글을 하나 써주세요.", "너무 사랑스럽네요! 보는 것만으로도 힐링이 됩니다. 행복한 하루 되세요 😊"],
    // 관계·직장 메시지 앵글 — "상대가 보낸 게 AI인지" 감을 훈련하는 시나리오
    ["연애 카톡", "연인에게 보내는 '오늘 하루 어땠어?' 안부 카톡을 써주세요.", "오늘 하루는 어떻게 보냈어? 항상 너의 하루가 행복으로 가득하길 바라. 힘든 일이 있었다면 언제든 이야기해줘, 내가 곁에 있을게."],
    ["연애 카톡", "다툰 뒤 화해하자고 먼저 보내는 카톡을 써주세요.", "먼저 연락해서 미안해. 우리가 다툰 건 서로를 소중하게 생각하기 때문이라고 생각해. 앞으로 더 잘 소통하며 좋은 관계를 만들어가자."],
    ["직장 메시지", "휴가를 쓰겠다고 상사에게 보내는 메시지를 써주세요.", "안녕하세요 팀장님. 개인 사정으로 인해 다음 주 휴가를 신청하고자 합니다. 업무에 지장이 없도록 사전에 인수인계를 마치겠습니다. 확인 부탁드립니다."],
    ["직장 메시지", "동료에게 급하게 도움을 요청하는 메시지를 써주세요.", "안녕하세요, 바쁘신 와중에 죄송합니다. 급한 사안이 생겨 도움을 요청드립니다. 잠시 시간 내주실 수 있을까요? 정말 감사하겠습니다."],
  ];
  const stmts: InStatement[] = prompts.map(([kind, prompt, ai_answer]) => ({
    sql: "INSERT INTO challenge_prompts (kind, prompt, ai_answer) VALUES (?, ?, ?)",
    args: [kind, prompt, ai_answer],
  }));
  await c.batch(stmts);
}

// ---------- seed: three founding specs from real, long-open OSS feature requests ----------

async function seed(c: SeedExecutor) {
  const stmts: InStatement[] = [];
  const proj = (
    id: number,
    slug: string,
    title: string,
    summary: string,
    source_label: string,
    source_url: string,
    spec_author: string,
    goal: number,
    escrowed: number,
    status: ProjectStatus,
    age: string
  ) =>
    stmts.push({
      sql: `INSERT INTO projects
              (id, slug, title, summary, source_label, source_url, category, spec_author,
               goal_credits, escrowed_credits, status, deadline_at, suite_ready, is_demo, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'devtools', ?, ?, ?, ?, datetime('now', ?, '+30 days'), 1, 1, datetime('now', ?))`,
      args: [id, slug, title, summary, source_label, source_url, spec_author, goal, escrowed, status, age, age],
    });
  const card = (pid: number, get: string[], dont: string[]) =>
    stmts.push({
      sql: "INSERT INTO contract_cards (project_id, you_get, you_dont_get) VALUES (?, ?, ?)",
      args: [pid, JSON.stringify(get), JSON.stringify(dont)],
    });
  const test = (pid: number, name: string, kind: AcceptanceTest["kind"]) =>
    stmts.push({
      sql: "INSERT INTO acceptance_tests (project_id, name, kind) VALUES (?, ?, ?)",
      args: [pid, name, kind],
    });
  const pledgeRow = (pid: number, backer: string, amount: number, age: string) =>
    stmts.push({
      sql: "INSERT INTO pledges (project_id, backer, amount, status, created_at) VALUES (?, ?, ?, 'escrowed', datetime('now', ?))",
      args: [pid, backer, amount, age],
    });
  const slot = (pid: number, builder: string, stake: number, age: string) =>
    stmts.push({
      sql: `INSERT INTO slots (project_id, builder, stake, status, expires_at, created_at)
            VALUES (?, ?, ?, 'active', datetime('now', ?, '+7 days'), datetime('now', ?))`,
      args: [pid, builder, stake, age, age],
    });
  const led = (pid: number, type: LedgerType, description: string, amount: number, actor: string, age: string) =>
    stmts.push({
      sql: "INSERT INTO ledger (project_id, type, description, amount, actor, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', ?))",
      args: [pid, type, description, amount, actor, age],
    });

  // 1. markdown-alerts — escrow full, slot active; verification runs come only from real executions
  proj(
    1,
    "markdown-alerts",
    "GitHub-style alerts extension for markdown renderers",
    "Render GitHub's alert blockquotes (> [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]) as styled alert blocks instead of plain quotes. A standalone renderAlerts(markdown) module any renderer can adopt.",
    "Long-requested in markdown-it / marked ecosystems since GitHub shipped alerts (2023)",
    "https://github.com/orgs/community/discussions/16925",
    "spec-guild/mira",
    2400,
    2400,
    "building",
    "-5 days"
  );
  card(
    1,
    [
      "A JS module exporting renderAlerts(markdown) that converts all five GitHub alert kinds into styled HTML blocks",
      "Case-insensitive markers, multi-line bodies, multiple alerts per document",
      "Ordinary blockquotes and unknown kinds left untouched",
      "MIT-licensed source + the exact test suite it was verified against",
    ],
    [
      "Not a full markdown parser — it handles alert blockquotes only",
      "No CSS theme (class names follow GitHub's convention; styling is yours)",
      "No plugin packaging for specific renderers (that is a follow-up spec)",
    ]
  );
  for (const n of [
    "converts > [!NOTE] blockquote into a note alert div",
    "converts [!WARNING] with Warning title",
    "converts [!TIP] with Tip title",
    "leaves ordinary blockquotes untouched",
    "marker is case-insensitive ([!note])",
    "multi-line alert bodies are preserved in order",
  ])
    test(1, n, "public");
  for (let i = 0; i < 4; i++) test(1, `holdout #${i + 1}`, "holdout");
  led(1, "status", "Spec published: 6 public + 4 holdout acceptance tests, contract card locked", 0, "spec-guild/mira", "-5 days");
  pledgeRow(1, "docs-team-lee", 900, "-4 days");
  led(1, "pledge", "docs-team-lee escrowed 900 credits — releases only on green", 900, "docs-team-lee", "-4 days");
  pledgeRow(1, "oss-fan-42", 700, "-4 days");
  led(1, "pledge", "oss-fan-42 escrowed 700 credits — releases only on green", 700, "oss-fan-42", "-4 days");
  pledgeRow(1, "renderer-maintainer", 800, "-3 days");
  led(1, "pledge", "renderer-maintainer escrowed 800 credits — releases only on green", 800, "renderer-maintainer", "-3 days");
  led(1, "status", "Pool full (2,400 cr escrowed). Build slot open to staked builders.", 0, "system", "-3 days");
  slot(1, "agentworks.dev", 120, "-2 days");
  led(1, "stake", "agentworks.dev staked 120 credits for a 7-day exclusive build slot", 120, "agentworks.dev", "-2 days");

  // 2. iso-duration — escrow full, slot active, no submission yet
  proj(
    2,
    "iso-duration",
    "Standalone ISO 8601 duration parser (the date-fns gap)",
    "parseDuration('P1Y2M3DT4H5M6S') → structured object. Weeks form, time-only form, fractional seconds, strict null on invalid input. The parse-side of ISO durations has been a years-open request in the date-fns ecosystem.",
    "date-fns issue #2261 'Add duration parsing' (open since 2021)",
    "https://github.com/date-fns/date-fns/issues/2261",
    "spec-guild/tomasz",
    3200,
    3200,
    "building",
    "-3 days"
  );
  card(
    2,
    [
      "A JS module exporting parseDuration(input) covering designator form, week form, time-only form, fractional values",
      "Strict: returns null for anything not a valid ISO 8601 duration",
      "MIT-licensed source + verified test suite",
    ],
    [
      "No duration arithmetic, formatting, or humanization (separate specs)",
      "No negative-duration extension (ISO 8601-2) in this spec",
    ]
  );
  for (const n of [
    "parses full designator form P1Y2M3DT4H5M6S",
    "parses week form P2W",
    "parses time-only form PT90M",
    "parses fractional seconds PT0.5S",
    "returns null for garbage input",
  ])
    test(2, n, "public");
  for (let i = 0; i < 3; i++) test(2, `holdout #${i + 1}`, "holdout");
  led(2, "status", "Spec published: 5 public + 3 holdout acceptance tests, contract card locked", 0, "spec-guild/tomasz", "-3 days");
  pledgeRow(2, "calendar-startup-cto", 1600, "-2 days");
  led(2, "pledge", "calendar-startup-cto escrowed 1,600 credits — releases only on green", 1600, "calendar-startup-cto", "-2 days");
  pledgeRow(2, "kim-solodev", 900, "-2 days");
  led(2, "pledge", "kim-solodev escrowed 900 credits — releases only on green", 900, "kim-solodev", "-2 days");
  pledgeRow(2, "fintech-batch-team", 700, "-1 days");
  led(2, "pledge", "fintech-batch-team escrowed 700 credits — releases only on green", 700, "fintech-batch-team", "-1 days");
  led(2, "status", "Pool full (3,200 cr escrowed). Build slot open to staked builders.", 0, "system", "-1 days");
  slot(2, "kim-solodev", 160, "-1 days");
  led(2, "stake", "kim-solodev staked 160 credits for a 7-day exclusive build slot", 160, "kim-solodev", "-1 days");

  // 3. slugify-korean — still funding
  proj(
    3,
    "slugify-korean",
    "Korean-aware slugify (Revised Romanization, not silent dropping)",
    "Mainstream slugify libraries silently drop Hangul — '한글 제목' becomes ''. This spec funds a slugify that transliterates Korean via Revised Romanization, mixed-script safe. A decade-old gap every Korean dev team patches by hand.",
    "slugify issue: 'Korean characters removed' — recurring since 2016",
    "https://github.com/simov/slugify/issues",
    "ethan",
    1800,
    640,
    "funding",
    "-1 days"
  );
  card(
    3,
    [
      "A JS module exporting slugify(input) that romanizes Hangul (Revised Romanization) instead of dropping it",
      "Mixed Korean/English input, clean ascii kebab-case output",
      "MIT-licensed source + verified test suite",
    ],
    [
      "No Chinese/Japanese transliteration in this spec",
      "No option flags (single sensible behavior; variants are follow-up specs)",
    ]
  );
  for (const n of [
    "romanizes plain Korean (안녕하세요 → annyeonghaseyo)",
    "mixed Korean + English + spaces (안녕 world → annyeong-world)",
    "does not silently drop Korean the way slugify@latest does",
    "lowercases, trims, collapses whitespace and punctuation to single dashes",
  ])
    test(3, n, "public");
  for (let i = 0; i < 3; i++) test(3, `holdout #${i + 1}`, "holdout");
  led(3, "status", "Spec published: 4 public + 3 holdout acceptance tests, contract card locked", 0, "ethan", "-1 days");
  pledgeRow(3, "naver-cafe-runner", 400, "-20 hours");
  led(3, "pledge", "naver-cafe-runner escrowed 400 credits — releases only on green", 400, "naver-cafe-runner", "-20 hours");
  pledgeRow(3, "kdev-blog", 240, "-10 hours");
  led(3, "pledge", "kdev-blog escrowed 240 credits — releases only on green", 240, "kdev-blog", "-10 hours");

  await c.batch(stmts);
}

// ---------- queries ----------

export interface ProjectWithSocial extends Project {
  score: number;
  watchers: number;
  comment_count: number;
}

const SOCIAL_SELECT = `
  SELECT projects.*,
    COALESCE((SELECT SUM(dir) FROM votes WHERE votes.project_id = projects.id), 0) AS score,
    (SELECT COUNT(*) FROM watches WHERE watches.project_id = projects.id) AS watchers,
    (SELECT COUNT(*) FROM comments WHERE comments.project_id = projects.id) AS comment_count
  FROM projects`;

export type SortKey = "best" | "new" | "raised" | "voted";

export async function listProjects(filter?: string, sort: SortKey = "best"): Promise<ProjectWithSocial[]> {
  const where =
    filter === "funding"
      ? "WHERE status = 'funding'"
      : filter === "building"
        ? "WHERE status IN ('building','open')"
        : filter === "green"
          ? "WHERE status = 'green'"
          : "";
  const order =
    sort === "new"
      ? "ORDER BY projects.created_at DESC, projects.id DESC"
      : sort === "raised"
        ? "ORDER BY projects.escrowed_credits DESC"
        : sort === "voted"
          ? "ORDER BY score DESC, projects.id ASC"
          : `ORDER BY CASE status
              WHEN 'building' THEN 0
              WHEN 'open' THEN 1
              WHEN 'funding' THEN 2
              WHEN 'green' THEN 3
              WHEN 'refunded' THEN 4
            END, score DESC, projects.id ASC`;
  return all<ProjectWithSocial>(`${SOCIAL_SELECT} ${where} ${order}`);
}

export async function getProject(idOrSlug: number | string): Promise<Project | undefined> {
  if (typeof idOrSlug === "number" || /^\d+$/.test(String(idOrSlug))) {
    return one<Project>("SELECT * FROM projects WHERE id = ?", [Number(idOrSlug)]);
  }
  return one<Project>("SELECT * FROM projects WHERE slug = ?", [String(idOrSlug)]);
}

export async function getContractCard(projectId: number): Promise<ContractCard | undefined> {
  const row = await one<{ project_id: number; you_get: string; you_dont_get: string }>(
    "SELECT * FROM contract_cards WHERE project_id = ?",
    [projectId]
  );
  if (!row) return undefined;
  return {
    project_id: row.project_id,
    you_get: JSON.parse(row.you_get),
    you_dont_get: JSON.parse(row.you_dont_get),
  };
}

export async function getAcceptanceTests(projectId: number): Promise<AcceptanceTest[]> {
  return all<AcceptanceTest>(
    "SELECT * FROM acceptance_tests WHERE project_id = ? ORDER BY kind = 'holdout', id",
    [projectId]
  );
}

export async function getPledges(projectId: number): Promise<Pledge[]> {
  return all<Pledge>("SELECT * FROM pledges WHERE project_id = ? ORDER BY created_at", [projectId]);
}

export async function getActiveSlot(projectId: number): Promise<Slot | undefined> {
  return one<Slot>(
    `SELECT * FROM slots WHERE project_id = ? AND status = 'active'
       AND expires_at IS NOT NULL AND expires_at > datetime('now') LIMIT 1`,
    [projectId]
  );
}

/** Bind a verification attempt to one exact live slot before the harness starts. */
export async function getRunnableSlot(projectId: number, builder: string): Promise<Slot | undefined> {
  return one<Slot>(
    `SELECT slots.* FROM slots
     JOIN projects ON projects.id = slots.project_id
     WHERE slots.project_id = ? AND slots.builder = ? COLLATE NOCASE
       AND slots.status = 'active' AND slots.expires_at IS NOT NULL
       AND slots.expires_at > datetime('now')
       AND projects.status = 'building' AND projects.suite_ready = 1 AND projects.is_demo = 0
       AND projects.deadline_at IS NOT NULL AND projects.deadline_at > datetime('now')
     ORDER BY slots.id DESC LIMIT 1`,
    [projectId, builder]
  );
}

export type RunWithResults = VerificationRun & { builder: string; results: TestResult[] };

export async function getRuns(projectId: number): Promise<RunWithResults[]> {
  const runs = await all<VerificationRun & { builder: string }>(
    `SELECT vr.*, s.builder AS builder FROM verification_runs vr
     JOIN slots s ON s.id = vr.slot_id
     WHERE vr.project_id = ? ORDER BY vr.created_at DESC, vr.id DESC`,
    [projectId]
  );
  const out: RunWithResults[] = [];
  for (const r of runs) {
    const results = await all<TestResult>("SELECT * FROM test_results WHERE run_id = ? ORDER BY id", [r.id]);
    out.push({ ...r, results });
  }
  return out;
}

export async function getLatestRun(projectId: number): Promise<RunWithResults | null> {
  const r = await one<VerificationRun & { builder: string }>(
    `SELECT vr.*, s.builder AS builder FROM verification_runs vr
     JOIN slots s ON s.id = vr.slot_id
     WHERE vr.project_id = ? ORDER BY vr.created_at DESC, vr.id DESC LIMIT 1`,
    [projectId]
  );
  if (!r) return null;
  const results = await all<TestResult>("SELECT * FROM test_results WHERE run_id = ? ORDER BY id", [r.id]);
  return { ...r, results };
}

export async function getLedger(projectId: number): Promise<LedgerEntry[]> {
  return all<LedgerEntry>("SELECT * FROM ledger WHERE project_id = ? ORDER BY created_at ASC, id ASC", [projectId]);
}

export async function getStats() {
  return (await one<{ escrowed: number; released: number; projects: number; green: number; runs: number }>(
    `SELECT
      (SELECT COALESCE(SUM(pledges.amount),0) FROM pledges
         JOIN projects ON projects.id = pledges.project_id
         WHERE pledges.status='escrowed' AND projects.is_demo=0) AS escrowed,
      (SELECT COALESCE(SUM(pledges.amount),0) FROM pledges
         JOIN projects ON projects.id = pledges.project_id
         WHERE pledges.status='paid_out' AND projects.is_demo=0) AS released,
      (SELECT COUNT(*) FROM projects WHERE is_demo=0) AS projects,
      (SELECT COUNT(*) FROM projects WHERE status='green' AND is_demo=0) AS green,
      (SELECT COUNT(*) FROM verification_runs
         JOIN projects ON projects.id = verification_runs.project_id
         WHERE projects.is_demo=0) AS runs`
  ))!;
}

export async function getProjectSocial(projectId: number, handle?: string) {
  const base = (await one<{ score: number; watchers: number }>(
    `SELECT
      COALESCE((SELECT SUM(dir) FROM votes WHERE project_id = ?), 0) AS score,
      (SELECT COUNT(*) FROM watches WHERE project_id = ?) AS watchers`,
    [projectId, projectId]
  ))!;
  let myVote = 0;
  let watching = false;
  if (handle) {
    const v = await one<{ dir: number }>("SELECT dir FROM votes WHERE project_id = ? AND handle = ?", [projectId, handle]);
    myVote = v?.dir ?? 0;
    watching = !!(await one("SELECT 1 AS x FROM watches WHERE project_id = ? AND handle = ?", [projectId, handle]));
  }
  return { ...base, myVote, watching };
}

export async function getComments(projectId: number): Promise<Comment[]> {
  return all<Comment>("SELECT * FROM comments WHERE project_id = ? ORDER BY created_at ASC, id ASC", [projectId]);
}

export async function getUserVotes(handle: string): Promise<Map<number, number>> {
  const rows = await all<{ project_id: number; dir: number }>(
    "SELECT project_id, dir FROM votes WHERE handle = ?",
    [handle]
  );
  return new Map(rows.map((r) => [Number(r.project_id), Number(r.dir)]));
}

export async function getUserPledges(handle: string) {
  return all<Pledge & { title: string; slug: string; pstatus: ProjectStatus }>(
    `SELECT pledges.*, projects.title, projects.slug, projects.status AS pstatus
     FROM pledges JOIN projects ON projects.id = pledges.project_id
     WHERE backer = ? COLLATE NOCASE AND projects.is_demo = 0
     ORDER BY pledges.created_at DESC`,
    [handle]
  );
}

export async function getUserSlots(handle: string) {
  return all<Slot & { title: string; slug: string }>(
    `SELECT slots.*, projects.title, projects.slug FROM slots
     JOIN projects ON projects.id = slots.project_id
     WHERE builder = ? COLLATE NOCASE AND projects.is_demo = 0
     ORDER BY slots.created_at DESC`,
    [handle]
  );
}

export async function getUserSpecs(handle: string): Promise<Project[]> {
  return all<Project>(
    "SELECT * FROM projects WHERE spec_author = ? COLLATE NOCASE AND is_demo = 0 ORDER BY created_at DESC",
    [handle]
  );
}

// ---------- meta (auth secret) ----------

export async function getMeta(key: string): Promise<string | undefined> {
  const row = await one<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  return row?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await run("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
}

/** Atomically initialize a meta value once and return the committed winner. */
export async function getOrCreateMeta(key: string, candidate: string): Promise<string> {
  return withWriteTransaction(async (tx) => {
    await tx.execute({
      sql: "INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING",
      args: [key, candidate],
    });
    const found = await tx.execute({ sql: "SELECT value FROM meta WHERE key = ?", args: [key] });
    const value = String(found.rows[0]?.value ?? "");
    if (!value) throw new Error(`meta initialization failed: ${key}`);
    return value;
  });
}

// ---------- users ----------

export interface UserRow {
  id: number;
  handle: string;
  pw_hash: string;
  credits: number;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  google_sub: string | null;
  github_id: string | null;
  created_at: string;
}

export type OAuthProvider = "google" | "github";

export async function getUserByProvider(
  provider: OAuthProvider,
  providerId: string
): Promise<UserRow | undefined> {
  const col = provider === "google" ? "google_sub" : "github_id";
  return one<UserRow>(`SELECT * FROM users WHERE ${col} = ?`, [providerId]);
}

async function isReservedHandle(handle: string): Promise<boolean> {
  return !!(await one("SELECT 1 AS x FROM handle_reservations WHERE handle = ? COLLATE NOCASE", [handle]));
}

export async function isHandleTaken(handle: string): Promise<boolean> {
  if (await isReservedHandle(handle)) return true;
  return !!(await one("SELECT 1 AS x FROM users WHERE handle = ?", [handle]));
}

export async function createOAuthUser(input: {
  handle: string;
  provider: OAuthProvider;
  providerId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}): Promise<number> {
  const googleSub = input.provider === "google" ? input.providerId : null;
  const githubId = input.provider === "github" ? input.providerId : null;
  return withWriteTransaction(async (tx) => {
    const reserved = await tx.execute({
      sql: `INSERT INTO handle_reservations (handle, kind)
            VALUES (?, 'user-pending') ON CONFLICT(handle) DO NOTHING`,
      args: [input.handle],
    });
    if (Number(reserved.rowsAffected ?? 0) !== 1) throw new Error("reserved handle");
    const inserted = await tx.execute({
      sql: `INSERT INTO users (handle, pw_hash, email, name, avatar_url, google_sub, github_id)
            VALUES (?, '', ?, ?, ?, ?, ?)`,
      args: [input.handle, input.email, input.name, input.avatarUrl, googleSub, githubId],
    });
    const id = Number(inserted.lastInsertRowid);
    const linked = await tx.execute({
      sql: `UPDATE handle_reservations SET kind = 'user', user_id = ?
            WHERE handle = ? COLLATE NOCASE AND kind = 'user-pending' AND user_id IS NULL`,
      args: [id, input.handle],
    });
    if (Number(linked.rowsAffected ?? 0) !== 1) throw new Error("handle reservation mismatch");
    return id;
  });
}

export async function getBalance(handle: string): Promise<number> {
  const row = await one<{ credits: number }>("SELECT credits FROM users WHERE handle = ?", [handle]);
  return Number(row?.credits ?? 0);
}

/** Credit a user's balance for internal rewards, payouts, and refunds. */
export async function grantCredits(handle: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  const result = await (await db()).execute({
    sql: "UPDATE users SET credits = credits + ? WHERE handle = ?",
    args: [Math.floor(amount), handle],
  });
  if (Number(result.rowsAffected ?? 0) !== 1) throw new Error("credit recipient not found");
}

/** Fulfill one paid Polar order exactly once, even when its webhook is retried. */
export async function fulfillPolarCredits(orderId: string, handle: string, amount: number): Promise<boolean> {
  const credits = Math.floor(amount);
  if (!orderId || !handle || credits <= 0) throw new Error("invalid Polar fulfillment");

  return withWriteTransaction(async (tx) => {
    const claimed = await tx.execute({
      sql: `INSERT INTO polar_fulfillments (order_id, handle, credits)
            VALUES (?, ?, ?) ON CONFLICT(order_id) DO NOTHING`,
      args: [orderId, handle, credits],
    });
    if (Number(claimed.rowsAffected ?? 0) === 0) {
      const existing = await tx.execute({
        sql: "SELECT handle, credits FROM polar_fulfillments WHERE order_id = ?",
        args: [orderId],
      });
      const row = existing.rows[0] as unknown as { handle: string; credits: number } | undefined;
      if (!row || row.handle.toLowerCase() !== handle.toLowerCase() || Number(row.credits) !== credits) {
        throw new Error("conflicting Polar fulfillment replay");
      }
      return false;
    }

    const credited = await tx.execute({
      sql: "UPDATE users SET credits = credits + ? WHERE handle = ?",
      args: [credits, handle],
    });
    if (Number(credited.rowsAffected ?? 0) !== 1) {
      throw new Error("Polar fulfillment user not found");
    }
    return true;
  });
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  return one<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}

// ---------- mutations ----------

export async function pledge(
  projectId: number,
  backer: string,
  amount: number,
  requestId: string
): Promise<void> {
  const requested = Math.floor(amount);
  if (requested <= 0 || !/^[a-zA-Z0-9_-]{16,100}$/.test(requestId)) return;

  try {
    await withWriteTransaction(async (tx) => {
      const claimedRequest = await tx.execute({
        sql: `INSERT INTO pledge_requests (request_id, project_id, backer, amount)
              VALUES (?, ?, ?, ?) ON CONFLICT(request_id) DO NOTHING`,
        args: [requestId, projectId, backer, requested],
      });
      if (Number(claimedRequest.rowsAffected ?? 0) !== 1) {
        const existing = await tx.execute({
          sql: "SELECT project_id, backer, amount FROM pledge_requests WHERE request_id = ?",
          args: [requestId],
        });
        const row = existing.rows[0] as unknown as { project_id: number; backer: string; amount: number } | undefined;
        if (
          row &&
          Number(row.project_id) === projectId &&
          row.backer.toLowerCase() === backer.toLowerCase() &&
          Number(row.amount) === requested
        ) {
          throw new MutationRejected("idempotent pledge replay");
        }
        throw new Error("pledge idempotency key reused with conflicting payload");
      }

      const projectResult = await tx.execute({
        sql: `SELECT goal_credits, escrowed_credits, status, deadline_at, suite_ready, is_demo
              FROM projects
              WHERE id = ? AND deadline_at IS NOT NULL AND deadline_at > datetime('now')`,
        args: [projectId],
      });
      const project = projectResult.rows[0] as unknown as {
        goal_credits: number;
        escrowed_credits: number;
        status: string;
        deadline_at: string | null;
        suite_ready: number;
        is_demo: number;
      } | undefined;
      if (
        !project ||
        project.status !== "funding" ||
        project.is_demo === 1 ||
        !project.deadline_at
      ) {
        throw new MutationRejected();
      }

      const balanceResult = await tx.execute({
        sql: "SELECT credits FROM users WHERE handle = ?",
        args: [backer],
      });
      const balance = Number((balanceResult.rows[0] as unknown as { credits: number } | undefined)?.credits ?? 0);
      const capped = Math.min(requested, Number(project.goal_credits) - Number(project.escrowed_credits), balance);
      if (capped <= 0) throw new MutationRejected();

      const escrowed = await tx.execute({
        sql: `UPDATE projects SET escrowed_credits = escrowed_credits + ?
              WHERE id = ? AND status = 'funding' AND is_demo = 0
                AND deadline_at IS NOT NULL AND deadline_at > datetime('now')
                AND escrowed_credits + ? <= goal_credits`,
        args: [capped, projectId, capped],
      });
      if (Number(escrowed.rowsAffected ?? 0) !== 1) throw new MutationRejected();

      const debited = await tx.execute({
        sql: "UPDATE users SET credits = credits - ? WHERE handle = ? AND credits >= ?",
        args: [capped, backer, capped],
      });
      if (Number(debited.rowsAffected ?? 0) !== 1) throw new MutationRejected();

      const insertedPledge = await tx.execute({
        sql: "INSERT INTO pledges (project_id, backer, amount) VALUES (?, ?, ?)",
        args: [projectId, backer, capped],
      });
      const linkedRequest = await tx.execute({
        sql: "UPDATE pledge_requests SET pledge_id = ? WHERE request_id = ? AND pledge_id IS NULL",
        args: [Number(insertedPledge.lastInsertRowid), requestId],
      });
      if (Number(linkedRequest.rowsAffected ?? 0) !== 1) throw new Error("pledge request link failed");
      await tx.execute({
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'pledge', ?, ?, ?)",
        args: [projectId, `${backer} escrowed ${capped.toLocaleString()} credits — releases only on green`, capped, backer],
      });

      if (Number(project.escrowed_credits) + capped >= Number(project.goal_credits)) {
        if (Number(project.suite_ready) === 1) {
          const opened = await tx.execute({
            sql: `UPDATE projects SET status = 'open'
                  WHERE id = ? AND status = 'funding' AND suite_ready = 1 AND is_demo = 0
                    AND deadline_at > datetime('now') AND escrowed_credits >= goal_credits`,
            args: [projectId],
          });
          if (Number(opened.rowsAffected ?? 0) === 1) {
            await tx.execute({
              sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', ?, 0, 'system')",
              args: [projectId, `Pool full (${Number(project.goal_credits).toLocaleString()} cr escrowed). Build slot open to staked builders.`],
            });
          }
        } else {
          await tx.execute({
            sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', ?, 0, 'system')",
            args: [projectId, `Pool full (${Number(project.goal_credits).toLocaleString()} cr escrowed). Slot remains locked until an executable suite is deployed.`],
          });
        }
      }
    });
  } catch (error) {
    if (error instanceof MutationRejected) return;
    throw error;
  }
}

export async function claimSlot(projectId: number, builder: string, stake: number): Promise<void> {
  const requestedStake = Math.floor(stake);
  if (requestedStake <= 0) return;

  try {
    await withWriteTransaction(async (tx) => {
      const eligibleResult = await tx.execute({
        sql: `SELECT goal_credits FROM projects
              WHERE id = ? AND status = 'open' AND suite_ready = 1 AND is_demo = 0
                AND deadline_at IS NOT NULL AND deadline_at > datetime('now')`,
        args: [projectId],
      });
      const eligible = eligibleResult.rows[0] as unknown as { goal_credits: number } | undefined;
      const requiredStake = eligible
        ? Math.max(1, Math.floor(Number(eligible.goal_credits) * SLOT_STAKE_RATIO))
        : 0;
      if (!eligible || requestedStake !== requiredStake) throw new MutationRejected();

      const active = await tx.execute({
        sql: "SELECT 1 AS x FROM slots WHERE project_id = ? AND status = 'active' LIMIT 1",
        args: [projectId],
      });
      if (active.rows.length > 0) throw new MutationRejected();

      const claimed = await tx.execute({
        sql: `UPDATE projects SET status = 'building'
              WHERE id = ? AND status = 'open' AND suite_ready = 1 AND is_demo = 0
                AND deadline_at IS NOT NULL AND deadline_at > datetime('now')`,
        args: [projectId],
      });
      if (Number(claimed.rowsAffected ?? 0) !== 1) throw new MutationRejected();

      const debited = await tx.execute({
        sql: "UPDATE users SET credits = credits - ? WHERE handle = ? AND credits >= ?",
        args: [requestedStake, builder, requestedStake],
      });
      if (Number(debited.rowsAffected ?? 0) !== 1) throw new MutationRejected();

      await tx.execute({
        sql: "INSERT INTO slots (project_id, builder, stake, expires_at) VALUES (?, ?, ?, datetime('now', '+7 days'))",
        args: [projectId, builder, requestedStake],
      });
      await tx.execute({
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'stake', ?, ?, ?)",
        args: [projectId, `${builder} staked ${requestedStake.toLocaleString()} credits for a 7-day exclusive build slot`, requestedStake, builder],
      });
    });
  } catch (error) {
    if (error instanceof MutationRejected) return;
    throw error;
  }
}

export async function setVote(projectId: number, handle: string, dir: 1 | -1 | 0): Promise<void> {
  if (dir === 0) {
    await run("DELETE FROM votes WHERE project_id = ? AND handle = ?", [projectId, handle]);
  } else {
    await run(
      "INSERT INTO votes (project_id, handle, dir) VALUES (?, ?, ?) ON CONFLICT(project_id, handle) DO UPDATE SET dir = excluded.dir",
      [projectId, handle, dir]
    );
  }
}

export async function toggleWatch(projectId: number, handle: string): Promise<void> {
  const exists = await one("SELECT 1 AS x FROM watches WHERE project_id = ? AND handle = ?", [projectId, handle]);
  if (exists) {
    await run("DELETE FROM watches WHERE project_id = ? AND handle = ?", [projectId, handle]);
  } else {
    await run("INSERT INTO watches (project_id, handle) VALUES (?, ?)", [projectId, handle]);
  }
}

export async function addComment(projectId: number, handle: string, body: string): Promise<void> {
  await run("INSERT INTO comments (project_id, handle, body) VALUES (?, ?, ?)", [projectId, handle, body]);
}

export interface HarnessResult {
  name: string;
  kind: "public" | "holdout";
  status: "pass" | "fail";
  detail?: string;
}

/** Record a completed authenticated harness execution and, on green, release
 * escrow atomically. The active slot owner and both time boundaries are checked
 * again inside the same write transaction that moves credits. */
export async function recordRun(
  projectId: number,
  submission: string,
  results: HarnessResult[],
  slotId: number,
  builder: string
): Promise<void> {
  const structurallyValid =
    results.length > 0 &&
    results.length <= 500 &&
    results.every(
      (r) =>
        typeof r.name === "string" &&
        (r.kind === "public" || r.kind === "holdout") &&
        (r.status === "pass" || r.status === "fail")
    );
  if (!structurallyValid) throw new Error("invalid harness results");

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.length - passed;
  const hasPublic = results.some((r) => r.kind === "public");
  const hasHoldout = results.some((r) => r.kind === "holdout");
  const green = failed === 0 && hasPublic && hasHoldout;

  await withWriteTransaction(async (tx) => {
    const projectResult = await tx.execute({
      sql: `SELECT * FROM projects
            WHERE id = ? AND status = 'building' AND suite_ready = 1 AND is_demo = 0
              AND deadline_at IS NOT NULL AND deadline_at > datetime('now')`,
      args: [projectId],
    });
    const p = projectResult.rows[0] as unknown as Project | undefined;
    if (!p) throw new MutationRejected("project is not payout-eligible");

    const slotResult = await tx.execute({
      sql: `SELECT * FROM slots
            WHERE id = ? AND project_id = ? AND status = 'active' AND builder = ? COLLATE NOCASE
              AND expires_at IS NOT NULL AND expires_at > datetime('now')`,
      args: [slotId, projectId, builder],
    });
    const slot = slotResult.rows[0] as unknown as Slot | undefined;
    if (!slot) throw new MutationRejected("caller does not own a live slot");

    const insertedRun = await tx.execute({
      sql: "INSERT INTO verification_runs (project_id, slot_id, submission, status, passed, failed) VALUES (?, ?, ?, ?, ?, ?)",
      args: [projectId, slot.id, submission, green ? "green" : "red", passed, failed],
    });
    const runId = Number(insertedRun.lastInsertRowid);
    const testRows: InStatement[] = results.map((result) => ({
      sql: "INSERT INTO test_results (run_id, name, kind, status, detail) VALUES (?, ?, ?, ?, ?)",
      args: [runId, result.name, result.kind, result.status, result.detail?.slice(0, 300) ?? null],
    }));
    await tx.batch(testRows);
    await tx.execute({
      sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'run', ?, 0, 'ci-runner')",
      args: [projectId, `Verification run #${runId} on ${submission}: ${passed}/${results.length} tests passed → ${green ? "GREEN" : "RED"}`],
    });
    if (!green) return;

    const escrow = await tx.execute({
      sql: "SELECT COUNT(*) AS count, COALESCE(SUM(amount), 0) AS total FROM pledges WHERE project_id = ? AND status = 'escrowed'",
      args: [projectId],
    });
    const pool = Number(p.goal_credits);
    if (Number(p.escrowed_credits) !== pool || Number(escrow.rows[0].total) !== pool) {
      throw new Error("escrow does not reconcile to project goal");
    }

    const wonPayout = await tx.execute({
      sql: `UPDATE projects SET status = 'green'
            WHERE id = ? AND status = 'building' AND suite_ready = 1 AND is_demo = 0
              AND deadline_at IS NOT NULL AND deadline_at > datetime('now')`,
      args: [projectId],
    });
    if (Number(wonPayout.rowsAffected ?? 0) !== 1) throw new MutationRejected("payout race lost");

    const closedSlot = await tx.execute({
      sql: `UPDATE slots SET status = 'succeeded'
            WHERE id = ? AND status = 'active' AND expires_at > datetime('now')`,
      args: [slot.id],
    });
    if (Number(closedSlot.rowsAffected ?? 0) !== 1) throw new MutationRejected("slot expired");

    const builderCut = Math.floor(pool * SPLIT.builder);
    const annuityCut = Math.floor(pool * SPLIT.annuity);
    const specCut = Math.floor(pool * SPLIT.spec_author);
    const platformCut = pool - builderCut - annuityCut - specCut;

    const paidPledges = await tx.execute({
      sql: "UPDATE pledges SET status = 'paid_out' WHERE project_id = ? AND status = 'escrowed'",
      args: [projectId],
    });
    if (Number(paidPledges.rowsAffected ?? 0) !== Number(escrow.rows[0].count)) {
      throw new Error("pledge settlement count mismatch");
    }

    const builderCredit = await tx.execute({
      sql: "UPDATE users SET credits = credits + ? WHERE handle = ? COLLATE NOCASE",
      args: [builderCut + slot.stake, slot.builder],
    });
    if (Number(builderCredit.rowsAffected ?? 0) !== 1) throw new Error("builder recipient not found");
    const authorCredit = await tx.execute({
      sql: "UPDATE users SET credits = credits + ? WHERE handle = ? COLLATE NOCASE",
      args: [specCut, p.spec_author],
    });
    if (Number(authorCredit.rowsAffected ?? 0) !== 1) throw new Error("spec author recipient not found");

    await tx.execute({
      sql: `INSERT INTO system_accounts (account, credits) VALUES ('maintenance-reserve', ?)
            ON CONFLICT(account) DO UPDATE SET credits = credits + excluded.credits`,
      args: [annuityCut],
    });
    await tx.execute({
      sql: `INSERT INTO system_accounts (account, credits) VALUES ('platform', ?)
            ON CONFLICT(account) DO UPDATE SET credits = credits + excluded.credits`,
      args: [platformCut],
    });

    const ledgerRows: InStatement[] = [
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', 'ALL TESTS GREEN — escrow released', 0, 'system')",
        args: [projectId],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'payout', ?, ?, ?)",
        args: [projectId, `Builder payout to ${slot.builder} (${Math.round(SPLIT.builder * 100)}%)`, -builderCut, slot.builder],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'stake_return', ?, ?, ?)",
        args: [projectId, `Successful slot stake returned to ${slot.builder}`, -slot.stake, slot.builder],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'annuity', ?, ?, 'maintenance-reserve')",
        args: [projectId, `Maintenance reserve funded (${Math.round(SPLIT.annuity * 100)}%)`, -annuityCut],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'spec_fee', ?, ?, ?)",
        args: [projectId, `Spec author fee to ${p.spec_author} (${Math.round(SPLIT.spec_author * 100)}%)`, -specCut, p.spec_author],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'platform_fee', ?, ?, 'poolproof')",
        args: [projectId, `Platform fee (${Math.round(SPLIT.platform * 100)}%)`, -platformCut],
      },
    ];
    await tx.batch(ledgerRows);
  });
}

// ---------- expiry (cron) ----------

/** Expire overdue build slots: burn half the stake, return half, reopen the slot. */
export async function expireSlots(): Promise<number> {
  const expired = await all<Slot & { pstatus: string }>(
    `SELECT slots.*, projects.status AS pstatus FROM slots
     JOIN projects ON projects.id = slots.project_id
     WHERE slots.status = 'active' AND slots.expires_at IS NOT NULL AND slots.expires_at <= datetime('now')
       AND projects.status = 'building' AND projects.is_demo = 0
       AND projects.deadline_at IS NOT NULL AND projects.deadline_at > datetime('now')`
  );
  let processed = 0;

  for (const s of expired) {
    const returned = Math.floor(s.stake / 2);
    const burned = s.stake - returned;
    try {
      await withWriteTransaction(async (tx) => {
        const claimed = await tx.execute({
          sql: `UPDATE slots SET status = 'failed'
                WHERE id = ? AND status = 'active'
                  AND expires_at IS NOT NULL AND expires_at <= datetime('now')
                  AND EXISTS (
                    SELECT 1 FROM projects WHERE id = slots.project_id
                      AND status = 'building' AND is_demo = 0
                      AND deadline_at IS NOT NULL AND deadline_at > datetime('now')
                  )`,
          args: [s.id],
        });
        if (Number(claimed.rowsAffected ?? 0) !== 1) throw new MutationRejected();

        const credited = await tx.execute({
          sql: "UPDATE users SET credits = credits + ? WHERE handle = ? COLLATE NOCASE",
          args: [returned, s.builder],
        });
        if (Number(credited.rowsAffected ?? 0) !== 1) throw new Error("expired slot recipient not found");
        await tx.batch([
          {
            sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'stake_return', ?, ?, ?)",
            args: [s.project_id, `Expired slot stake returned to ${s.builder}`, -returned, s.builder],
          },
          {
            sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'stake_burn', ?, ?, 'system')",
            args: [s.project_id, `Expired slot stake burned for ${s.builder}`, -burned],
          },
          {
            sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', ?, 0, 'system')",
            args: [
              s.project_id,
              `Slot expired without green: ${s.builder} forfeits ${burned.toLocaleString()} cr and receives ${returned.toLocaleString()} cr back. Slot reopens.`,
            ],
          },
        ]);
        const reopened = await tx.execute({
          sql: `UPDATE projects SET status = CASE WHEN suite_ready = 1 THEN 'open' ELSE 'funding' END
                WHERE id = ? AND status = 'building' AND is_demo = 0
                  AND deadline_at IS NOT NULL AND deadline_at > datetime('now')`,
          args: [s.project_id],
        });
        if (Number(reopened.rowsAffected ?? 0) !== 1) throw new MutationRejected();
      });
      processed += 1;
    } catch (error) {
      if (error instanceof MutationRejected) continue;
      throw error;
    }
  }
  return processed;
}

/** Refund projects past their deadline without a green run — every escrowed credit goes back. */
export async function refundExpiredProjects(): Promise<number> {
  const expired = await all<Project>(
    `SELECT * FROM projects
     WHERE status IN ('funding','open','building') AND is_demo = 0
       AND deadline_at IS NOT NULL AND deadline_at <= datetime('now')`
  );
  let processed = 0;

  for (const p of expired) {
    try {
      await withWriteTransaction(async (tx) => {
        const claimed = await tx.execute({
          sql: `UPDATE projects SET status = 'refunded'
                WHERE id = ? AND status IN ('funding','open','building') AND is_demo = 0
                  AND deadline_at IS NOT NULL AND deadline_at <= datetime('now')`,
          args: [p.id],
        });
        if (Number(claimed.rowsAffected ?? 0) !== 1) throw new MutationRejected();

        const pledgeResult = await tx.execute({
          sql: "SELECT * FROM pledges WHERE project_id = ? AND status = 'escrowed'",
          args: [p.id],
        });
        const pledges = pledgeResult.rows as unknown as Pledge[];
        if (pledges.length > 0) {
          // One batched round trip avoids an unbounded interactive transaction.
          const credited = await tx.batch(
            pledges.map((pl) => ({
              sql: "UPDATE users SET credits = credits + ? WHERE handle = ? COLLATE NOCASE",
              args: [pl.amount, pl.backer],
            }))
          );
          if (credited.some((result) => Number(result.rowsAffected ?? 0) !== 1)) {
            throw new Error("refund recipient not found");
          }
          await tx.batch(
            pledges.map((pl) => ({
              sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'refund', ?, ?, ?)",
              args: [p.id, `Refund of ${pl.amount.toLocaleString()} cr to ${pl.backer}`, -pl.amount, pl.backer],
            }))
          );
          const settled = await tx.execute({
            sql: "UPDATE pledges SET status = 'refunded' WHERE project_id = ? AND status = 'escrowed'",
            args: [p.id],
          });
          if (Number(settled.rowsAffected ?? 0) !== pledges.length) throw new Error("pledge refund mismatch");
        }

        const slotResult = await tx.execute({
          sql: "SELECT * FROM slots WHERE project_id = ? AND status = 'active' LIMIT 1",
          args: [p.id],
        });
        const slot = slotResult.rows[0] as unknown as Slot | undefined;
        if (slot) {
          const closed = await tx.execute({
            sql: "UPDATE slots SET status = 'failed' WHERE id = ? AND status = 'active'",
            args: [slot.id],
          });
          if (Number(closed.rowsAffected ?? 0) !== 1) throw new MutationRejected();
          const credited = await tx.execute({
            sql: "UPDATE users SET credits = credits + ? WHERE handle = ? COLLATE NOCASE",
            args: [slot.stake, slot.builder],
          });
          if (Number(credited.rowsAffected ?? 0) !== 1) throw new Error("deadline slot recipient not found");
          await tx.batch([
            {
              sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'stake_return', ?, ?, ?)",
              args: [p.id, `Deadline stake return to ${slot.builder}`, -slot.stake, slot.builder],
            },
            {
              sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', ?, 0, 'system')",
              args: [p.id, `Active slot closed by project deadline — full stake returned to ${slot.builder}.`],
            },
          ]);
        }

        await tx.execute({
          sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', 'Deadline reached without green — escrow refunded in full', 0, 'system')",
          args: [p.id],
        });
      });
      processed += 1;
    } catch (error) {
      if (error instanceof MutationRejected) continue;
      throw error;
    }
  }
  return processed;
}

export async function createSpec(input: {
  slug: string;
  title: string;
  summary: string;
  source_label: string;
  source_url: string;
  category: string;
  spec_author: string;
  goal_credits: number;
  you_get: string[];
  you_dont_get: string[];
  criteria: string[];
}): Promise<void> {
  await withWriteTransaction(async (tx) => {
    const author = await tx.execute({
      sql: "SELECT 1 AS x FROM users WHERE handle = ? COLLATE NOCASE",
      args: [input.spec_author],
    });
    if (author.rows.length !== 1) throw new Error("spec author not found");

    const inserted = await tx.execute({
      sql: `INSERT INTO projects
              (slug, title, summary, source_label, source_url, category, spec_author, goal_credits, deadline_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))`,
      args: [
        input.slug,
        input.title,
        input.summary,
        input.source_label,
        input.source_url,
        input.category,
        input.spec_author,
        input.goal_credits,
      ],
    });
    const id = Number(inserted.lastInsertRowid);
    const stmts: InStatement[] = [
      {
        sql: "INSERT INTO contract_cards (project_id, you_get, you_dont_get) VALUES (?, ?, ?)",
        args: [id, JSON.stringify(input.you_get), JSON.stringify(input.you_dont_get)],
      },
      ...input.criteria.map((criterion) => ({
        sql: "INSERT INTO acceptance_tests (project_id, name, kind) VALUES (?, ?, 'public')",
        args: [id, criterion] as (string | number)[],
      })),
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', ?, 0, ?)",
        args: [
          id,
          `Spec published: ${input.criteria.length} public acceptance criteria, contract card locked. Executable suite is curated before the pool can close.`,
          input.spec_author,
        ],
      },
    ];
    await tx.batch(stmts);
  });
}

// ---------- 판별 게임 supply loop: challenges & submissions ----------

export interface ChallengePrompt {
  id: number;
  kind: string;
  prompt: string;
  ai_answer: string | null;
  active: number;
  created_at: string;
}

export type SubmissionStatus = "pending" | "published" | "rejected";

export interface Submission {
  id: number;
  prompt_id: number;
  author: string;
  body: string;
  ai_body: string;
  ai_model: string | null;
  owns: number;
  no_ai: number;
  status: SubmissionStatus;
  created_at: string;
}

export async function getActivePrompts(): Promise<ChallengePrompt[]> {
  return all<ChallengePrompt>("SELECT * FROM challenge_prompts WHERE active = 1 ORDER BY id");
}

export async function getPrompt(id: number): Promise<ChallengePrompt | undefined> {
  return one<ChallengePrompt>("SELECT * FROM challenge_prompts WHERE id = ?", [id]);
}

/**
 * Record a player's answer to a challenge. Generates the AI counterpart (live
 * Claude if ANTHROPIC_API_KEY is set, else the curated bank) and stores the
 * submission as `pending` — it enters the game only after admin approval.
 * `owns` is the required ownership/consent claim.
 */
export async function createSubmission(input: {
  promptId: number;
  author: string;
  body: string;
  owns: boolean;
  noAi: boolean;
}): Promise<number | null> {
  const prompt = await getPrompt(input.promptId);
  if (!prompt || prompt.active !== 1) return null;
  const ai = await generateAiCounterpart({
    prompt: prompt.prompt,
    kind: prompt.kind,
    ai_answer: prompt.ai_answer,
  });
  return run(
    `INSERT INTO submissions (prompt_id, author, body, ai_body, ai_model, owns, no_ai, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [input.promptId, input.author, input.body, ai.body, ai.model, input.owns ? 1 : 0, input.noAi ? 1 : 0]
  );
}

export interface TopicAnswer {
  body: string;
  author: string | null;
  source: Source;
  model: string | null;
}

/**
 * All published answers to one prompt — every person's human answer plus the AI
 * counterpart(s). This is the "same topic, compare people" surface: humans side
 * by side, with the AI hidden among them until reveal.
 */
export async function getTopicAnswers(
  promptId: number
): Promise<{ prompt: ChallengePrompt; answers: TopicAnswer[] } | null> {
  const prompt = await getPrompt(promptId);
  if (!prompt) return null;
  const answers = await all<TopicAnswer>(
    `SELECT game_items.body, game_items.author, game_items.source, game_items.model
     FROM game_items JOIN submissions ON submissions.id = game_items.submission_id
     WHERE submissions.prompt_id = ? AND submissions.status = 'published'
     ORDER BY game_items.source = 'ai', game_items.id`,
    [promptId]
  );
  return { prompt, answers };
}

export type Source = "human" | "ai";

export async function getPendingSubmissions(): Promise<(Submission & { kind: string; prompt: string })[]> {
  return all<Submission & { kind: string; prompt: string }>(
    `SELECT submissions.*, challenge_prompts.kind, challenge_prompts.prompt
     FROM submissions JOIN challenge_prompts ON challenge_prompts.id = submissions.prompt_id
     WHERE submissions.status = 'pending' ORDER BY submissions.created_at ASC`
  );
}

export async function getUserSubmissions(handle: string): Promise<(Submission & { kind: string })[]> {
  return all<Submission & { kind: string }>(
    `SELECT submissions.*, challenge_prompts.kind
     FROM submissions JOIN challenge_prompts ON challenge_prompts.id = submissions.prompt_id
     WHERE submissions.author = ? COLLATE NOCASE ORDER BY submissions.created_at DESC`,
    [handle]
  );
}

/**
 * Approve a pending submission: publish it into the game pool as a human/AI
 * item pair sharing the same prompt, so the existing daily picker and grading
 * pick them up unchanged. Idempotent — a non-pending submission is a no-op.
 */
export async function approveSubmission(id: number): Promise<boolean> {
  const s = await one<Submission & { kind: string; prompt: string }>(
    `SELECT submissions.*, challenge_prompts.kind, challenge_prompts.prompt
     FROM submissions JOIN challenge_prompts ON challenge_prompts.id = submissions.prompt_id
     WHERE submissions.id = ?`,
    [id]
  );
  if (!s || s.status !== "pending") return false;
  const aiBody = (s.ai_body || "").trim();
  if (!aiBody) return false; // no counterpart → nothing to pair against
  await batch([
    { sql: "UPDATE submissions SET status = 'published' WHERE id = ?", args: [id] },
    {
      sql: "INSERT INTO game_items (domain, body, source, model, note, author, prompt, submission_id) VALUES (?, ?, 'human', NULL, ?, ?, ?, ?)",
      args: [s.kind, s.body, `사람이 쓴 답 — @${s.author}`, s.author, s.prompt, id],
    },
    {
      sql: "INSERT INTO game_items (domain, body, source, model, note, author, prompt, submission_id) VALUES (?, ?, 'ai', ?, ?, NULL, ?, ?)",
      args: [s.kind, aiBody, s.ai_model, "AI가 같은 주제로 쓴 답", s.prompt, id],
    },
  ]);
  return true;
}

export async function rejectSubmission(id: number): Promise<void> {
  await run("UPDATE submissions SET status = 'rejected' WHERE id = ? AND status = 'pending'", [id]);
}

// ---------- 원샷 챌린지 ----------

export interface OneShotRun {
  id: number;
  slug: string;
  player: string;
  display: string;
  prompt: string;
  model: string;
  code: string;
  public_pass: number;
  public_total: number;
  holdout_pass: number;
  holdout_total: number;
  green: number;
  died_at: number | null;
  detail: string | null;
  created_at: string;
}

export interface OneShotBoardRow {
  slug: string;
  model: string;
  attempts: number;
  greens: number;
}

export async function recordOneShotRun(input: {
  attemptId: string;
  slug: string;
  player: string;
  display: string;
  prompt: string;
  model: string;
  code: string;
  publicPass: number;
  publicTotal: number;
  holdoutPass: number;
  holdoutTotal: number;
  green: boolean;
  diedAt: number | null;
  detail: string | null;
  rewardHandle: string;
  rewardCredits: number;
}): Promise<{ id: number; creditsAwarded: number }> {
  return withWriteTransaction(async (tx) => {
    const claim = await tx.execute({
      sql: `SELECT 1 AS x FROM oneshot_attempts
            WHERE attempt_id = ? AND slug = ? AND player = ?
              AND status = 'spent' AND run_id IS NULL`,
      args: [input.attemptId, input.slug, input.player],
    });
    if (claim.rows.length !== 1) throw new Error("one-shot attempt was not claimed");

    const inserted = await tx.execute({
      sql: `INSERT INTO oneshot_runs
              (slug, player, display, prompt, model, code,
               public_pass, public_total, holdout_pass, holdout_total, green, died_at, detail)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        input.slug, input.player, input.display, input.prompt, input.model, input.code,
        input.publicPass, input.publicTotal, input.holdoutPass, input.holdoutTotal,
        input.green ? 1 : 0, input.diedAt, input.detail,
      ],
    });
    const id = Number(inserted.lastInsertRowid);
    let creditsAwarded = 0;
    const reward = Math.floor(input.rewardCredits);
    if (
      input.green &&
      reward > 0 &&
      input.player.toLowerCase() === input.rewardHandle.toLowerCase()
    ) {
      const credited = await tx.execute({
        sql: "UPDATE users SET credits = credits + ? WHERE handle = ? COLLATE NOCASE",
        args: [reward, input.rewardHandle],
      });
      if (Number(credited.rowsAffected ?? 0) !== 1) throw new Error("one-shot reward recipient not found");
      await tx.execute({
        sql: "INSERT INTO oneshot_rewards (run_id, handle, credits) VALUES (?, ?, ?)",
        args: [id, input.rewardHandle, reward],
      });
      creditsAwarded = reward;
    }
    const completed = await tx.execute({
      sql: `UPDATE oneshot_attempts SET status = 'completed', run_id = ?
            WHERE attempt_id = ? AND slug = ? AND player = ?
              AND status = 'spent' AND run_id IS NULL`,
      args: [id, input.attemptId, input.slug, input.player],
    });
    if (Number(completed.rowsAffected ?? 0) !== 1) throw new Error("one-shot attempt completion mismatch");
    return { id, creditsAwarded };
  });
}

/** Per-(task, model) one-shot success rates — the board nobody else can publish. */
export async function getOneShotBoard(): Promise<OneShotBoardRow[]> {
  const c = await getReadyClient();
  const res = await c.execute(
    `SELECT slug, model, COUNT(*) AS attempts, SUM(green) AS greens
     FROM oneshot_runs GROUP BY slug, model ORDER BY slug, attempts DESC`
  );
  return res.rows as unknown as OneShotBoardRow[];
}

/** Recent attempts, newest first — the public record (both greens and deaths). */
export async function getRecentOneShotRuns(limit = 20): Promise<OneShotRun[]> {
  const c = await getReadyClient();
  const res = await c.execute({
    sql: `SELECT id, slug, player, display, prompt, model, code,
                 public_pass, public_total, holdout_pass, holdout_total, green, died_at, detail, created_at
          FROM oneshot_runs ORDER BY id DESC LIMIT ?`,
    args: [limit],
  });
  return res.rows as unknown as OneShotRun[];
}

/** Mark the claimed budget as spent immediately before model dispatch. */
export async function markOneShotSpent(attemptId: string, slug: string, player: string): Promise<void> {
  const c = await getReadyClient();
  const spent = await c.execute({
    sql: `UPDATE oneshot_attempts SET status = 'spent'
          WHERE attempt_id = ? AND slug = ? AND player = ? AND status = 'claimed'`,
    args: [attemptId, slug, player],
  });
  if (Number(spent.rowsAffected ?? 0) !== 1) throw new Error("one-shot claim is not spendable");
}

/** Atomically enforce per-task, per-account, and global daily model budgets. */
export async function claimOneShotToday(slug: string, player: string): Promise<string | null> {
  const configured = Number(process.env.ONESHOT_DAILY_GLOBAL_LIMIT ?? 20);
  const globalLimit = Number.isFinite(configured) ? Math.min(500, Math.max(1, Math.floor(configured))) : 20;
  return withWriteTransaction(async (tx) => {
    const counts = await tx.execute({
      sql: `SELECT
              COUNT(*) AS global_count,
              SUM(CASE WHEN player = ? THEN 1 ELSE 0 END) AS player_count
            FROM oneshot_attempts WHERE day = date('now')`,
      args: [player],
    });
    const row = counts.rows[0] as unknown as { global_count: number; player_count: number | null };
    if (Number(row.global_count) >= globalLimit || Number(row.player_count ?? 0) >= 3) return null;
    const attemptId = crypto.randomUUID();
    const claimed = await tx.execute({
      sql: `INSERT INTO oneshot_attempts (attempt_id, day, slug, player)
            VALUES (?, date('now'), ?, ?) ON CONFLICT(day, slug, player) DO NOTHING`,
      args: [attemptId, slug, player],
    });
    return Number(claimed.rowsAffected ?? 0) === 1 ? attemptId : null;
  });
}

/** Release a claim only when execution failed before a run was recorded. */
export async function releaseOneShotClaim(attemptId: string, slug: string, player: string): Promise<void> {
  const c = await getReadyClient();
  await c.execute({
    sql: `DELETE FROM oneshot_attempts
          WHERE attempt_id = ? AND slug = ? AND player = ? AND status = 'claimed'`,
    args: [attemptId, slug, player],
  });
}

/** Daily attempt count for display and diagnostics. */
export async function countOneShotToday(slug: string, player: string): Promise<number> {
  const c = await getReadyClient();
  const res = await c.execute({
    sql: `SELECT COUNT(*) AS n FROM oneshot_runs
          WHERE slug = ? AND player = ? AND date(created_at) = date('now')`,
    args: [slug, player],
  });
  return Number((res.rows[0] as unknown as { n: number }).n);
}
