import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import { recordRun, type HarnessResult } from "./db";

const execFileAsync = promisify(execFile);

const SPECS_ROOT = path.join(process.cwd(), "specs");
const SUBMISSIONS_ROOT = path.join(process.cwd(), "submissions");
const RUN_TIMEOUT_MS = 15_000;

/** Submission files available for a project (demo: local dir; production: git ref). */
export function listSubmissions(slug: string): string[] {
  const dir = path.join(SUBMISSIONS_ROOT, slug);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".mjs"))
    .sort();
}

export function specExists(slug: string): boolean {
  return fs.existsSync(path.join(SPECS_ROOT, slug, "public.test.mjs"));
}

/**
 * The actual public acceptance-test source for a project — so spec authors and
 * builders see the real executable suite, not a natural-language black box.
 * Holdout tests are deliberately never exposed here.
 */
export function readPublicSuite(slug: string): string | null {
  const p = path.join(SPECS_ROOT, slug, "public.test.mjs");
  if (!fs.existsSync(p)) return null;
  try {
    return fs.readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

/**
 * Execute the project's acceptance suite against a submission in a hardened
 * child process:
 *  - clean environment (no secrets inherited — submissions must never see
 *    TURSO_AUTH_TOKEN or anything else from the platform)
 *  - Node permission model: read-only fs access limited to specs/ and
 *    submissions/, no fs writes, no child processes, no workers
 *  - hard timeout + bounded output
 * Known residual risk: the permission model does not block outbound network;
 * full network isolation is the Vercel Sandbox migration (tracked).
 */
export async function runVerification(
  projectId: number,
  slug: string,
  submissionFile: string
): Promise<void> {
  const allowed = listSubmissions(slug);
  if (!allowed.includes(submissionFile)) {
    throw new Error(`unknown submission: ${submissionFile}`);
  }
  const specDir = path.join(SPECS_ROOT, slug);
  const submissionPath = path.join(SUBMISSIONS_ROOT, slug, submissionFile);

  let results: HarnessResult[];
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        "--permission",
        `--allow-fs-read=${SPECS_ROOT}`,
        `--allow-fs-read=${SUBMISSIONS_ROOT}`,
        path.join(SPECS_ROOT, "_harness.mjs"),
        specDir,
        submissionPath,
      ],
      {
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        env: {
          // deliberately minimal — nothing from process.env leaks to submissions
          PATH: "",
          NODE_ENV: "production",
        },
      }
    );
    results = JSON.parse(stdout) as HarnessResult[];
  } catch (e) {
    results = [
      {
        name: "verification harness completed",
        kind: "public",
        status: "fail",
        detail: `harness error: ${String(e instanceof Error ? e.message : e).slice(0, 300)}`,
      },
    ];
  }

  await recordRun(projectId, submissionFile, results);
}
