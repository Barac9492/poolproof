import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { readPublicSuite, runSuiteOnFile } from "./runner";
import { markOneShotSpent, recordOneShotRun, type OneShotRun } from "./db";
import { ONESHOT_GREEN_REWARD } from "./economy";

// 원샷 챌린지 core: one prompt, one generation, one run, holdout decides.
// Strategy source of truth: docs/oneshot-strategy.md §2.
//
// The participant's prompt is the ONLY steering input. The platform frames the
// task (public suite as the API contract — never the holdout), sends prompt +
// frame to a fixed model, writes the returned module to a scratch path, and
// executes it exactly once through the hardened harness. No retries, no edits.

const MODEL = "claude-opus-4-8";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_PROMPT_CHARS = 500;

/** Credits paid out for a green one-shot (signed-in players only). */
export { ONESHOT_GREEN_REWARD };

export interface OneShotTask {
  slug: string;
  title: string;
  /** One sentence a non-developer understands (spec-meme rule). */
  oneLiner: string;
}

/** Tasks eligible for one-shot: specs that HAVE a holdout suite — no holdout,
 * no spectacle (원샷 100% kills the tension band). */
export const ONESHOT_TASKS: OneShotTask[] = [
  {
    slug: "josa",
    title: "조사 자동선택",
    oneLiner: "단어 뒤에 은/는·이/가·(으)로를 알아서 붙이는 함수. 서울로? 서울으로?",
  },
  {
    slug: "markdown-alerts",
    title: "마크다운 알림 블록",
    oneLiner: "GitHub식 > [!NOTE] 알림 블록을 HTML로 바꾸는 변환기.",
  },
  {
    slug: "wordle-solver",
    title: "워들 솔버",
    oneLiner: "피드백(🟩🟨⬜)을 보고 다음 단어를 고르는 워들 풀이 전략.",
  },
];

export function getOneShotTask(slug: string): OneShotTask | undefined {
  return ONESHOT_TASKS.find((t) => t.slug === slug);
}

export function liveModelEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export interface OneShotOutcome {
  run: OneShotRun;
  cells: { kind: "public" | "holdout"; pass: boolean; name: string }[];
  creditsAwarded: number;
}

/** Strip a single ```-fence wrapper if the model added one despite instructions. */
function stripFence(text: string): string {
  const m = text.trim().match(/^```(?:\w+)?\n([\s\S]*?)\n```$/);
  return m ? m[1] : text.trim();
}

async function generateCode(task: OneShotTask, userPrompt: string): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("live-disabled");

  const suite = readPublicSuite(task.slug);
  if (!suite) throw new Error(`no public suite for ${task.slug}`);

  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 3000,
      system:
        "너는 원샷 코딩 챌린지의 코드 생성 모델이다. 참가자의 프롬프트가 유일한 지시이고, 출력된 코드는 수정 없이 딱 한 번 실행된다.\n" +
        "규칙:\n" +
        "- 아래 공개 테스트 파일이 요구하는 API를 export하는 단일 ES module(.mjs) 하나만 출력하라.\n" +
        "- 출력은 코드만. 설명·마크다운 펜스·주석 머리말 금지.\n" +
        "- import는 허용되지 않는다. 파일시스템·네트워크·process 등 호스트 기능은 사용할 수 없다.\n" +
        "- 공개 테스트 외에 숨은 테스트(holdout)가 있다. 공개 케이스 하드코딩으로는 통과할 수 없다.",
      messages: [
        {
          role: "user",
          content:
            `## 과제: ${task.title}\n\n## 공개 테스트 (이 API를 구현해야 함)\n\`\`\`js\n${suite}\n\`\`\`\n\n## 참가자 프롬프트\n${userPrompt}`,
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`anthropic ${res.status}`);
  const data = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  const code = stripFence(text);
  if (!code) throw new Error("empty completion");
  return code;
}

/**
 * The whole one-shot: generate from the prompt, run once, record the verdict.
 * Throws "live-disabled" when no API key is configured (cost-staged design,
 * same convention as ai.ts).
 */
export async function executeOneShot(
  attemptId: string,
  slug: string,
  userPrompt: string,
  player: string,
  display: string
): Promise<OneShotOutcome> {
  const task = getOneShotTask(slug);
  if (!task) throw new Error(`unknown one-shot task: ${slug}`);
  const prompt = userPrompt.trim().slice(0, MAX_PROMPT_CHARS);
  if (prompt.length < 4) throw new Error("prompt-too-short");

  // From this point the daily/global model budget stays consumed even if the
  // upstream request or later harness fails. This prevents paid-call retries by
  // forcing a post-dispatch error.
  await markOneShotSpent(attemptId, slug, player);
  const code = await generateCode(task, prompt);

  // Scratch file in the OS tmpdir — works both locally and on serverless (/tmp).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pp-oneshot-"));
  const file = path.join(dir, `${crypto.randomUUID()}.mjs`);
  let results;
  try {
    fs.writeFileSync(file, code, "utf8");
    results = await runSuiteOnFile(slug, file);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  const pub = results.filter((r) => r.kind === "public");
  const hold = results.filter((r) => r.kind === "holdout");
  const publicPass = pub.filter((r) => r.status === "pass").length;
  const holdoutPass = hold.filter((r) => r.status === "pass").length;
  const green = pub.length > 0 && hold.length > 0 && results.every((r) => r.status === "pass");
  const firstDead = hold.findIndex((r) => r.status === "fail");
  const firstFail = results.find((r) => r.status === "fail");
  const safeFailureDetail = firstFail
    ? firstFail.kind === "holdout"
      ? "숨은 테스트 실패"
      : `${firstFail.name}${firstFail.detail ? ` — ${firstFail.detail}` : ""}`.slice(0, 300)
    : null;

  const recorded = await recordOneShotRun({
    attemptId,
    slug,
    player,
    display,
    prompt,
    model: MODEL,
    code,
    publicPass,
    publicTotal: pub.length,
    holdoutPass,
    holdoutTotal: hold.length,
    green,
    diedAt: firstDead === -1 ? null : firstDead + 1,
    detail: safeFailureDetail,
    rewardHandle: player,
    rewardCredits: ONESHOT_GREEN_REWARD,
  });

  return {
    run: {
      id: recorded.id,
      slug,
      player,
      display,
      prompt,
      model: MODEL,
      code,
      public_pass: publicPass,
      public_total: pub.length,
      holdout_pass: holdoutPass,
      holdout_total: hold.length,
      green: green ? 1 : 0,
      died_at: firstDead === -1 ? null : firstDead + 1,
      detail: safeFailureDetail,
      created_at: new Date().toISOString(),
    },
    // Holdout NAMES never leave the server (grid.ts rule) — only kind + pass.
    cells: results.map((r) => ({
      kind: r.kind,
      pass: r.status === "pass",
      name: r.kind === "holdout" ? "(비공개)" : r.name,
    })),
    creditsAwarded: recorded.creditsAwarded,
  };
}
