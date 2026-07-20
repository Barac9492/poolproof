import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { recordRun, type HarnessResult } from "./db";
import { PRIVATE_HOLDOUT_ENV } from "./holdouts";

const execFileAsync = promisify(execFile);

const SPECS_ROOT = path.join(process.cwd(), "specs");
const SUBMISSIONS_ROOT = path.join(process.cwd(), "submissions");
const RUN_TIMEOUT_MS = 15_000;
const RESULT_PREFIX = "PP_RESULT_V1:";

interface SignedHarnessPayload {
  version: 1;
  manifest: { name: string; kind: "public" | "holdout" }[];
  results: HarnessResult[];
}

function harnessFailure(detail: string): HarnessResult[] {
  return [
    {
      name: "verification harness completed",
      kind: "public",
      status: "fail",
      detail: detail.slice(0, 300),
    },
  ];
}

/** Accept exactly one authenticated, complete result manifest from the trusted
 * harness. Candidate stdout is untrusted noise and is never parsed directly. */
function parseSignedResults(stdout: string, secret: string): HarnessResult[] {
  const valid: SignedHarnessPayload[] = [];
  for (const line of stdout.split("\n")) {
    if (!line.startsWith(RESULT_PREFIX)) continue;
    try {
      const envelope = JSON.parse(line.slice(RESULT_PREFIX.length)) as {
        payload?: unknown;
        mac?: unknown;
      };
      if (!envelope.payload || typeof envelope.mac !== "string") continue;
      const body = JSON.stringify(envelope.payload);
      const expected = crypto.createHmac("sha256", secret).update(body).digest();
      const actual = Buffer.from(envelope.mac, "base64url");
      if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) continue;
      valid.push(envelope.payload as SignedHarnessPayload);
    } catch {
      // Invalid candidate-controlled output is ignored. No valid envelope below
      // becomes a fail-closed harness result.
    }
  }
  if (valid.length !== 1) throw new Error("missing or ambiguous authenticated result");

  const payload = valid[0];
  if (payload.version !== 1 || !Array.isArray(payload.manifest) || !Array.isArray(payload.results)) {
    throw new Error("invalid result envelope");
  }
  if (payload.manifest.length === 0 || payload.manifest.length > 500) {
    throw new Error("invalid test manifest size");
  }
  if (payload.results.length !== payload.manifest.length) {
    throw new Error("incomplete test result set");
  }

  let publicCount = 0;
  let holdoutCount = 0;
  const sanitized: HarnessResult[] = [];
  for (let i = 0; i < payload.manifest.length; i += 1) {
    const expected = payload.manifest[i];
    const result = payload.results[i];
    if (
      !expected ||
      typeof expected.name !== "string" ||
      expected.name.length < 1 ||
      expected.name.length > 200 ||
      (expected.kind !== "public" && expected.kind !== "holdout") ||
      !result ||
      result.name !== expected.name ||
      result.kind !== expected.kind ||
      (result.status !== "pass" && result.status !== "fail") ||
      (result.detail !== undefined && typeof result.detail !== "string")
    ) {
      throw new Error("result does not match signed manifest");
    }
    if (expected.kind === "public") publicCount += 1;
    else holdoutCount += 1;
    sanitized.push({
      name: expected.name,
      kind: expected.kind,
      status: result.status,
      ...(result.detail ? { detail: result.detail.slice(0, 300) } : {}),
    });
  }
  // A normal run must prove both the public contract and at least one private
  // case. The signed synthetic module-load failure is intentionally public-only.
  const syntheticLoadFailure =
    sanitized.length === 1 &&
    sanitized[0].name === "submission module loads" &&
    sanitized[0].status === "fail";
  if (!syntheticLoadFailure && (publicCount === 0 || holdoutCount === 0)) {
    throw new Error("public or private suite missing");
  }
  return sanitized;
}
function privateHoldoutPayload(slug: string): string {
  const envName = PRIVATE_HOLDOUT_ENV[slug];
  if (!envName) throw new Error(`private holdout mapping is not configured for ${slug}`);

  const configured = process.env[envName];
  if (configured) return configured;

  const localHoldout = path.join(SPECS_ROOT, slug, "holdout.test.mjs");
  if (process.env.NODE_ENV !== "production" && fs.existsSync(localHoldout)) {
    return Buffer.from(fs.readFileSync(localHoldout, "utf8")).toString("base64");
  }
  throw new Error(`private holdout is not configured for ${slug}`);
}

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

/** Runtime readiness requires both the public contract and a loadable private
 * payload. The DB suite_ready bit is a separate business approval gate. */
export function verificationSuiteReady(slug: string): boolean {
  if (!specExists(slug) || !PRIVATE_HOLDOUT_ENV[slug]) return false;
  try {
    const encoded = process.env[PRIVATE_HOLDOUT_ENV[slug]];
    if (encoded) {
      const source = Buffer.from(encoded, "base64").toString("utf8");
      return source.length > 0 && source.length <= 512_000 && source.includes("export default");
    }
    return (
      process.env.NODE_ENV !== "production" &&
      fs.existsSync(path.join(SPECS_ROOT, slug, "holdout.test.mjs"))
    );
  } catch {
    return false;
  }
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
 * child process. Candidate code runs in a separate VM realm with no imports,
 * process, host objects, filesystem, network global, workers, or child process;
 * the outer process also has a clean environment, Node permissions, a memory
 * cap, a hard timeout, and authenticated result envelopes.
 */
export async function runVerification(
  projectId: number,
  slug: string,
  submissionFile: string,
  slotId: number,
  builder: string
): Promise<void> {
  if (!verificationSuiteReady(slug)) throw new Error(`verification suite is not ready: ${slug}`);
  const allowed = listSubmissions(slug);
  if (!allowed.includes(submissionFile)) {
    throw new Error(`unknown submission: ${submissionFile}`);
  }
  const submissionPath = path.join(SUBMISSIONS_ROOT, slug, submissionFile);
  const results = await execHarness(slug, submissionPath, [SUBMISSIONS_ROOT]);
  await recordRun(projectId, submissionFile, results, slotId, builder);
}

/**
 * Run a spec's suite against an arbitrary module file (one-shot mode: code that
 * was just generated from a prompt, written to a scratch path). Same hardened
 * child process as runVerification; only the extra read allowance differs.
 * Returns results instead of recording — the caller owns the one-shot ledger.
 */
export async function runSuiteOnFile(slug: string, filePath: string): Promise<HarnessResult[]> {
  if (!verificationSuiteReady(slug)) throw new Error(`verification suite is not ready: ${slug}`);
  return execHarness(slug, filePath, [path.dirname(filePath)]);
}

async function execHarness(
  slug: string,
  submissionPath: string,
  extraReadDirs: string[]
): Promise<HarnessResult[]> {
  const specDir = path.join(SPECS_ROOT, slug);
  const privateHoldout = privateHoldoutPayload(slug);
  const resultSecret = crypto.randomBytes(32).toString("hex");
  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [
        "--experimental-vm-modules",
        "--max-old-space-size=64",
        "--disable-proto=throw",
        "--permission",
        `--allow-fs-read=${SPECS_ROOT}`,
        ...extraReadDirs.map((d) => `--allow-fs-read=${d}`),
        path.join(SPECS_ROOT, "_harness.mjs"),
        specDir,
        submissionPath,
      ],
      {
        timeout: RUN_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        env: {
          // The harness consumes and deletes this before importing untrusted code.
          PATH: "",
          NODE_ENV: "production",
          PP_HOLDOUT_B64: privateHoldout,
          PP_RESULT_SECRET: resultSecret,
        },
      }
    );
    return parseSignedResults(stdout, resultSecret);
  } catch (e) {
    return harnessFailure(`harness error: ${String(e instanceof Error ? e.message : e)}`);
  }
}
