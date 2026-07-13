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
  // ---- 판별 게임 (human-vs-AI text detection): a pool of items whose ground
  // truth (source) is known by construction. `source` never leaves the server. ----
  `CREATE TABLE IF NOT EXISTS game_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL,
    body TEXT NOT NULL,
    source TEXT NOT NULL,
    model TEXT,
    note TEXT NOT NULL DEFAULT ''
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
  await topUpGameItems(c);
  const count = await c.execute("SELECT COUNT(*) AS c FROM projects");
  if (Number(count.rows[0].c) > 0) return;
  await seed(c);
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
