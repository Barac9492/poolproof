import { createClient, type Client, type InStatement } from "@libsql/client";
import path from "path";

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
  | "refund";

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

function dbUrl(): string {
  if (process.env.TURSO_DATABASE_URL) return process.env.TURSO_DATABASE_URL;
  if (process.env.VERCEL) return "file:/tmp/poolproof.db"; // ephemeral fallback until Turso env lands
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
    status TEXT NOT NULL DEFAULT 'funding',
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
    kind TEXT NOT NULL DEFAULT 'public'
  )`,
  `CREATE TABLE IF NOT EXISTS pledges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    backer TEXT NOT NULL,
    amount INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'escrowed',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS slots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    builder TEXT NOT NULL,
    stake INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS verification_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    slot_id INTEGER NOT NULL REFERENCES slots(id),
    submission TEXT NOT NULL,
    status TEXT NOT NULL,
    passed INTEGER NOT NULL DEFAULT 0,
    failed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS test_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL REFERENCES verification_runs(id),
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL,
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
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`,
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
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
  // Free predict-the-winner (playbook move 4): no stakes, ever — the payout
  // is a streak, not credits. One pick per slot; locked once the slot's
  // first run resolves it.
  `CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL REFERENCES projects(id),
    slot_id INTEGER NOT NULL REFERENCES slots(id),
    handle TEXT NOT NULL COLLATE NOCASE,
    pick TEXT NOT NULL CHECK (pick IN ('green', 'red')),
    resolved INTEGER NOT NULL DEFAULT 0,
    correct INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    UNIQUE (slot_id, handle)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_predictions_slot ON predictions(slot_id)`,
  `CREATE INDEX IF NOT EXISTS idx_predictions_handle ON predictions(handle, resolved_at)`,
];

async function safeAlter(c: Client, sql: string): Promise<void> {
  try {
    await c.execute(sql);
  } catch {
    // column already exists
  }
}

async function migrateAndSeed(c: Client): Promise<void> {
  await c.batch(DDL, "write");
  // additive migrations for the credits economy + deadlines (idempotent)
  await safeAlter(c, "ALTER TABLE users ADD COLUMN credits INTEGER NOT NULL DEFAULT 500");
  await safeAlter(c, "ALTER TABLE users ADD COLUMN email TEXT");
  await safeAlter(c, "ALTER TABLE users ADD COLUMN name TEXT");
  await safeAlter(c, "ALTER TABLE users ADD COLUMN avatar_url TEXT");
  await safeAlter(c, "ALTER TABLE users ADD COLUMN google_sub TEXT");
  await safeAlter(c, "ALTER TABLE users ADD COLUMN github_id TEXT");
  await safeAlter(c, "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google ON users(google_sub) WHERE google_sub IS NOT NULL");
  await safeAlter(c, "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github ON users(github_id) WHERE github_id IS NOT NULL");
  await safeAlter(c, "ALTER TABLE projects ADD COLUMN deadline_at TEXT");
  await safeAlter(c, "ALTER TABLE slots ADD COLUMN expires_at TEXT");
  // arena frame is a first-class mode, not a slug hack (concierge test #1 graduates)
  await safeAlter(c, "ALTER TABLE projects ADD COLUMN mode TEXT NOT NULL DEFAULT 'escrow'");
  const migrated = await c.execute("SELECT value FROM meta WHERE key = 'migr_arena_mode'");
  if (migrated.rows.length === 0) {
    await c.execute("UPDATE projects SET mode = 'arena' WHERE slug = 'wordle-solver'");
    await c.execute("INSERT INTO meta (key, value) VALUES ('migr_arena_mode', '1')");
  }
  await c.execute(
    "UPDATE projects SET deadline_at = datetime(created_at, '+30 days') WHERE deadline_at IS NULL AND status != 'green'"
  );
  await c.execute(
    "UPDATE slots SET expires_at = datetime(created_at, '+7 days') WHERE expires_at IS NULL AND status = 'active'"
  );
  const count = await c.execute("SELECT COUNT(*) AS c FROM projects");
  if (Number(count.rows[0].c) > 0) return;
  await seed(c);
}

// ---------- seed: three founding specs from real, long-open OSS feature requests ----------

async function seed(c: Client) {
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
    status: string,
    age: string
  ) =>
    stmts.push({
      sql: `INSERT INTO projects (id, slug, title, summary, source_label, source_url, category, spec_author, goal_credits, escrowed_credits, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'devtools', ?, ?, ?, ?, datetime('now', ?))`,
      args: [id, slug, title, summary, source_label, source_url, spec_author, goal, escrowed, status, age],
    });
  const card = (pid: number, get: string[], dont: string[]) =>
    stmts.push({
      sql: "INSERT INTO contract_cards (project_id, you_get, you_dont_get) VALUES (?, ?, ?)",
      args: [pid, JSON.stringify(get), JSON.stringify(dont)],
    });
  const test = (pid: number, name: string, kind: string) =>
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
      sql: "INSERT INTO slots (project_id, builder, stake, status, created_at) VALUES (?, ?, ?, 'active', datetime('now', ?))",
      args: [pid, builder, stake, age],
    });
  const led = (pid: number, type: string, description: string, amount: number, actor: string, age: string) =>
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

  await c.batch(stmts, "write");
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
  return one<Slot>("SELECT * FROM slots WHERE project_id = ? AND status = 'active' LIMIT 1", [projectId]);
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
      (SELECT COALESCE(SUM(amount),0) FROM pledges WHERE status='escrowed') AS escrowed,
      (SELECT COALESCE(SUM(amount),0) FROM pledges WHERE status='paid_out') AS released,
      (SELECT COUNT(*) FROM projects) AS projects,
      (SELECT COUNT(*) FROM projects WHERE status='green') AS green,
      (SELECT COUNT(*) FROM verification_runs) AS runs`
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
     WHERE backer = ? COLLATE NOCASE ORDER BY pledges.created_at DESC`,
    [handle]
  );
}

export async function getUserSlots(handle: string) {
  return all<Slot & { title: string; slug: string }>(
    `SELECT slots.*, projects.title, projects.slug FROM slots
     JOIN projects ON projects.id = slots.project_id
     WHERE builder = ? COLLATE NOCASE ORDER BY slots.created_at DESC`,
    [handle]
  );
}

export async function getUserSpecs(handle: string): Promise<Project[]> {
  return all<Project>("SELECT * FROM projects WHERE spec_author = ? COLLATE NOCASE ORDER BY created_at DESC", [handle]);
}

// ---------- meta (auth secret) ----------

export async function getMeta(key: string): Promise<string | undefined> {
  const row = await one<{ value: string }>("SELECT value FROM meta WHERE key = ?", [key]);
  return row?.value;
}

export async function setMeta(key: string, value: string): Promise<void> {
  await run("INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", [key, value]);
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

export async function isHandleTaken(handle: string): Promise<boolean> {
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
  return run(
    `INSERT INTO users (handle, pw_hash, email, name, avatar_url, google_sub, github_id)
     VALUES (?, '', ?, ?, ?, ?, ?)`,
    [input.handle, input.email, input.name, input.avatarUrl, googleSub, githubId]
  );
}

export async function getBalance(handle: string): Promise<number> {
  const row = await one<{ credits: number }>("SELECT credits FROM users WHERE handle = ?", [handle]);
  return Number(row?.credits ?? 0);
}

/** Credit a user's balance (Stripe fulfillment, payouts, refunds). No-op for non-user handles. */
export async function grantCredits(handle: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  await run("UPDATE users SET credits = credits + ? WHERE handle = ?", [Math.floor(amount), handle]);
}

export async function getUserById(id: number): Promise<UserRow | undefined> {
  return one<UserRow>("SELECT * FROM users WHERE id = ?", [id]);
}

// ---------- mutations ----------

export async function pledge(projectId: number, backer: string, amount: number): Promise<void> {
  const p = await getProject(projectId);
  if (!p || p.status !== "funding" || amount <= 0) return;
  const balance = await getBalance(backer);
  const capped = Math.min(amount, p.goal_credits - p.escrowed_credits, balance);
  if (capped <= 0) return;
  const stmts: InStatement[] = [
    { sql: "UPDATE users SET credits = credits - ? WHERE handle = ?", args: [capped, backer] },
    { sql: "UPDATE projects SET escrowed_credits = escrowed_credits + ? WHERE id = ?", args: [capped, projectId] },
    { sql: "INSERT INTO pledges (project_id, backer, amount) VALUES (?, ?, ?)", args: [projectId, backer, capped] },
    {
      sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'pledge', ?, ?, ?)",
      args: [projectId, `${backer} escrowed ${capped.toLocaleString()} credits — releases only on green`, capped, backer],
    },
  ];
  if (p.escrowed_credits + capped >= p.goal_credits) {
    stmts.push(
      { sql: "UPDATE projects SET status = 'open' WHERE id = ?", args: [projectId] },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', ?, 0, 'system')",
        args: [projectId, `Pool full (${p.goal_credits.toLocaleString()} cr escrowed). Build slot open to staked builders.`],
      }
    );
  }
  await batch(stmts);
}

export async function claimSlot(projectId: number, builder: string, stake: number): Promise<void> {
  const p = await getProject(projectId);
  if (!p || p.status !== "open") return;
  if (await getActiveSlot(projectId)) return;
  if ((await getBalance(builder)) < stake) return;
  await batch([
    { sql: "UPDATE users SET credits = credits - ? WHERE handle = ?", args: [stake, builder] },
    {
      sql: "INSERT INTO slots (project_id, builder, stake, expires_at) VALUES (?, ?, ?, datetime('now', '+7 days'))",
      args: [projectId, builder, stake],
    },
    { sql: "UPDATE projects SET status = 'building' WHERE id = ?", args: [projectId] },
    {
      sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'stake', ?, ?, ?)",
      args: [projectId, `${builder} staked ${stake.toLocaleString()} credits for a 7-day exclusive build slot`, stake, builder],
    },
  ]);
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

// ---------- predictions (free predict-the-winner, no stakes) ----------

export type Pick = "green" | "red";

export interface PredictionPanelData {
  slotId: number;
  builder: string;
  /** still accepting new picks — the slot's first run hasn't landed yet */
  open: boolean;
  green: number;
  red: number;
  mine: { pick: Pick; resolved: boolean; correct: boolean | null } | null;
}

/** The slot this project's prediction panel is about: the active one, or else the most recent. */
export async function getPredictionPanel(projectId: number, handle?: string): Promise<PredictionPanelData | null> {
  const slot = await one<Slot>(
    "SELECT * FROM slots WHERE project_id = ? ORDER BY created_at DESC, id DESC LIMIT 1",
    [projectId]
  );
  if (!slot) return null;
  const counts = await all<{ pick: Pick; n: number }>(
    "SELECT pick, COUNT(*) AS n FROM predictions WHERE slot_id = ? GROUP BY pick",
    [slot.id]
  );
  const green = counts.find((c) => c.pick === "green")?.n ?? 0;
  const red = counts.find((c) => c.pick === "red")?.n ?? 0;
  let mine: PredictionPanelData["mine"] = null;
  if (handle) {
    const row = await one<{ pick: Pick; resolved: number; correct: number | null }>(
      "SELECT pick, resolved, correct FROM predictions WHERE slot_id = ? AND handle = ?",
      [slot.id, handle]
    );
    if (row) mine = { pick: row.pick, resolved: !!row.resolved, correct: row.correct === null ? null : !!row.correct };
  }
  return { slotId: slot.id, builder: slot.builder, open: slot.status === "active", green, red, mine };
}

/** Cast or change a pick. Locked once the slot resolves (WHERE resolved = 0 makes later attempts a no-op). */
export async function setPrediction(projectId: number, slotId: number, handle: string, pick: Pick): Promise<void> {
  await run(
    `INSERT INTO predictions (project_id, slot_id, handle, pick) VALUES (?, ?, ?, ?)
     ON CONFLICT (slot_id, handle) DO UPDATE SET pick = excluded.pick WHERE predictions.resolved = 0`,
    [projectId, slotId, handle, pick]
  );
}

export interface Streak {
  current: number;
  best: number;
  correct: number;
  total: number;
}

function computeStreak(picksInOrder: boolean[]): Omit<Streak, "correct" | "total"> {
  let best = 0;
  let run = 0;
  for (const correct of picksInOrder) {
    run = correct ? run + 1 : 0;
    if (run > best) best = run;
  }
  let current = 0;
  for (let i = picksInOrder.length - 1; i >= 0 && picksInOrder[i]; i--) current++;
  return { current, best };
}

export async function getStreak(handle: string): Promise<Streak> {
  const rows = await all<{ correct: number }>(
    "SELECT correct FROM predictions WHERE handle = ? AND resolved = 1 ORDER BY resolved_at ASC, id ASC",
    [handle]
  );
  const bools = rows.map((r) => !!r.correct);
  const { current, best } = computeStreak(bools);
  return { current, best, correct: bools.filter(Boolean).length, total: bools.length };
}

export interface LadderRow extends Streak {
  handle: string;
}

/** Ranked by current streak, then best streak, then total correct calls. */
export async function getLadder(limit = 50): Promise<LadderRow[]> {
  const rows = await all<{ handle: string; correct: number }>(
    "SELECT handle, correct FROM predictions WHERE resolved = 1 ORDER BY handle, resolved_at ASC, id ASC"
  );
  const byHandle = new Map<string, boolean[]>();
  for (const r of rows) {
    if (!byHandle.has(r.handle)) byHandle.set(r.handle, []);
    byHandle.get(r.handle)!.push(!!r.correct);
  }
  const ladder: LadderRow[] = [];
  for (const [handle, bools] of byHandle) {
    const { current, best } = computeStreak(bools);
    ladder.push({ handle, current, best, correct: bools.filter(Boolean).length, total: bools.length });
  }
  ladder.sort((a, b) => b.current - a.current || b.best - a.best || b.correct - a.correct);
  return ladder.slice(0, limit);
}

export interface HarnessResult {
  name: string;
  kind: "public" | "holdout";
  status: "pass" | "fail";
  detail?: string;
}

/** Record a completed harness execution and, on green, release the escrow atomically. */
export async function recordRun(projectId: number, submission: string, results: HarnessResult[]): Promise<void> {
  const p = await getProject(projectId);
  if (!p) throw new Error("no such project");
  const slot = await getActiveSlot(projectId);
  if (!slot) throw new Error("no active build slot");

  const passed = results.filter((r) => r.status === "pass").length;
  const failed = results.length - passed;
  const green = failed === 0 && results.length > 0;

  const runId = await run(
    "INSERT INTO verification_runs (project_id, slot_id, submission, status, passed, failed) VALUES (?, ?, ?, ?, ?, ?)",
    [projectId, slot.id, submission, green ? "green" : "red", passed, failed]
  );

  const stmts: InStatement[] = results.map((r) => ({
    sql: "INSERT INTO test_results (run_id, name, kind, status, detail) VALUES (?, ?, ?, ?, ?)",
    args: [runId, r.name, r.kind, r.status, r.detail ?? null],
  }));
  stmts.push({
    sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'run', ?, 0, 'ci-runner')",
    args: [projectId, `Verification run #${runId} on ${submission}: ${passed}/${results.length} tests passed → ${green ? "GREEN" : "RED"}`],
  });

  // resolve any open predictions on this slot — first run to land settles them
  const openPicks = await all<{ id: number; pick: Pick }>(
    "SELECT id, pick FROM predictions WHERE slot_id = ? AND resolved = 0",
    [slot.id]
  );
  const verdict: Pick = green ? "green" : "red";
  for (const pred of openPicks) {
    stmts.push({
      sql: "UPDATE predictions SET resolved = 1, correct = ?, resolved_at = datetime('now') WHERE id = ?",
      args: [pred.pick === verdict ? 1 : 0, pred.id],
    });
  }

  if (green) {
    const pool = p.goal_credits;
    const builderCut = Math.floor(pool * SPLIT.builder);
    const annuityCut = Math.floor(pool * SPLIT.annuity);
    const specCut = Math.floor(pool * SPLIT.spec_author);
    const platformCut = pool - builderCut - annuityCut - specCut; // remainder → no reconciliation gaps

    stmts.push(
      { sql: "UPDATE pledges SET status = 'paid_out' WHERE project_id = ? AND status = 'escrowed'", args: [projectId] },
      { sql: "UPDATE slots SET status = 'succeeded' WHERE id = ?", args: [slot.id] },
      { sql: "UPDATE projects SET status = 'green' WHERE id = ?", args: [projectId] },
      // balance credits — no-ops for non-user handles, real deposits for real accounts
      { sql: "UPDATE users SET credits = credits + ? WHERE handle = ?", args: [builderCut + slot.stake, slot.builder] },
      { sql: "UPDATE users SET credits = credits + ? WHERE handle = ?", args: [specCut, p.spec_author] },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', 'ALL TESTS GREEN — escrow released', 0, 'system')",
        args: [projectId],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'payout', ?, ?, ?)",
        args: [projectId, `Builder payout to ${slot.builder} (${Math.round(SPLIT.builder * 100)}%) + stake returned`, -(builderCut + slot.stake), slot.builder],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'annuity', ?, ?, 'annuity-reserve')",
        args: [projectId, `Maintenance annuity reserved (${Math.round(SPLIT.annuity * 100)}%) — streams monthly while main stays green`, -annuityCut],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'spec_fee', ?, ?, ?)",
        args: [projectId, `Spec author fee to ${p.spec_author} (${Math.round(SPLIT.spec_author * 100)}%)`, -specCut, p.spec_author],
      },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'platform_fee', ?, ?, 'poolproof')",
        args: [projectId, `Platform fee (${Math.round(SPLIT.platform * 100)}%)`, -platformCut],
      }
    );
  }

  await batch(stmts);
}

// ---------- expiry (cron) ----------

/** Expire overdue build slots: burn half the stake, return half, reopen the slot. */
export async function expireSlots(): Promise<number> {
  const expired = await all<Slot & { pstatus: string }>(
    `SELECT slots.*, projects.status AS pstatus FROM slots
     JOIN projects ON projects.id = slots.project_id
     WHERE slots.status = 'active' AND slots.expires_at IS NOT NULL AND slots.expires_at < datetime('now')`
  );
  for (const s of expired) {
    const returned = Math.floor(s.stake / 2);
    const burned = s.stake - returned;
    const stmts: InStatement[] = [
      { sql: "UPDATE slots SET status = 'failed' WHERE id = ?", args: [s.id] },
      { sql: "UPDATE users SET credits = credits + ? WHERE handle = ?", args: [returned, s.builder] },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', ?, 0, 'system')",
        args: [
          s.project_id,
          `Slot expired without green: ${s.builder} forfeits ${burned.toLocaleString()} cr (half of stake), ${returned.toLocaleString()} cr returned. Slot reopens.`,
        ],
      },
    ];
    if (s.pstatus === "building") {
      stmts.push({ sql: "UPDATE projects SET status = 'open' WHERE id = ?", args: [s.project_id] });
    }
    await batch(stmts);
  }
  return expired.length;
}

/** Refund projects past their deadline without a green run — every escrowed credit goes back. */
export async function refundExpiredProjects(): Promise<number> {
  const expired = await all<Project>(
    `SELECT * FROM projects
     WHERE status IN ('funding','open','building')
       AND deadline_at IS NOT NULL AND deadline_at < datetime('now')`
  );
  for (const p of expired) {
    const pledges = await all<Pledge>(
      "SELECT * FROM pledges WHERE project_id = ? AND status = 'escrowed'",
      [p.id]
    );
    const stmts: InStatement[] = [
      { sql: "UPDATE projects SET status = 'refunded' WHERE id = ?", args: [p.id] },
      { sql: "UPDATE pledges SET status = 'refunded' WHERE project_id = ? AND status = 'escrowed'", args: [p.id] },
      {
        sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', 'Deadline reached without green — escrow refunded in full', 0, 'system')",
        args: [p.id],
      },
    ];
    for (const pl of pledges) {
      stmts.push(
        { sql: "UPDATE users SET credits = credits + ? WHERE handle = ?", args: [pl.amount, pl.backer] },
        {
          sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'refund', ?, ?, ?)",
          args: [p.id, `Refund of ${pl.amount.toLocaleString()} cr to ${pl.backer}`, pl.amount, pl.backer],
        }
      );
    }
    // an active slot is not the builder's fault here — full stake back
    const slot = await getActiveSlot(p.id);
    if (slot) {
      stmts.push(
        { sql: "UPDATE slots SET status = 'failed' WHERE id = ?", args: [slot.id] },
        { sql: "UPDATE users SET credits = credits + ? WHERE handle = ?", args: [slot.stake, slot.builder] },
        {
          sql: "INSERT INTO ledger (project_id, type, description, amount, actor) VALUES (?, 'status', ?, 0, 'system')",
          args: [p.id, `Active slot closed by project deadline — full stake returned to ${slot.builder}.`],
        }
      );
    }
    await batch(stmts);
  }
  return expired.length;
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
  const id = await run(
    `INSERT INTO projects (slug, title, summary, source_label, source_url, category, spec_author, goal_credits, deadline_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '+30 days'))`,
    [
      input.slug,
      input.title,
      input.summary,
      input.source_label,
      input.source_url,
      input.category,
      input.spec_author,
      input.goal_credits,
    ]
  );
  const stmts: InStatement[] = [
    {
      sql: "INSERT INTO contract_cards (project_id, you_get, you_dont_get) VALUES (?, ?, ?)",
      args: [id, JSON.stringify(input.you_get), JSON.stringify(input.you_dont_get)],
    },
    ...input.criteria.map((c) => ({
      sql: "INSERT INTO acceptance_tests (project_id, name, kind) VALUES (?, ?, 'public')",
      args: [id, c] as (string | number)[],
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
  await batch(stmts);
}
