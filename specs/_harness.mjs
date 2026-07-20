// Poolproof verification harness.
// Usage: node specs/_harness.mjs <specDir> <submissionEntry>
// Loads private holdouts before importing untrusted submission code, deletes
// the one-time environment payload, then runs both suites in memory.

import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";
import { createContext, runInContext, SourceTextModule } from "node:vm";
import { pathToFileURL } from "node:url";

const [specDir, submissionEntry] = process.argv.slice(2);
if (!specDir || !submissionEntry) {
  console.error("usage: node _harness.mjs <specDir> <submissionEntry>");
  process.exit(2);
}

// The parent creates a fresh secret for each run. Capture and delete it before
// any untrusted module is imported. Only an envelope signed by this trusted
// controller is accepted by runner.ts, so a submission cannot print a forged
// all-green result or exit early and still trigger a payout.
const resultSecret = process.env.PP_RESULT_SECRET;
delete process.env.PP_RESULT_SECRET;
if (!resultSecret || resultSecret.length < 32) {
  console.error("missing result authentication secret");
  process.exit(2);
}
const RESULT_PREFIX = "PP_RESULT_V1:";
const trustedStringify = JSON.stringify.bind(JSON);
const trustedWrite = process.stdout.write.bind(process.stdout);
const trustedString = String;
const trustedPush = Function.call.bind(Array.prototype.push);
const trustedClone = structuredClone;

function emitSigned(manifest, results) {
  const payload = { version: 1, manifest, results };
  const body = trustedStringify(payload);
  const mac = createHmac("sha256", resultSecret).update(body).digest("base64url");
  trustedWrite(`${RESULT_PREFIX}${trustedStringify({ payload, mac })}\n`);
}

async function loadFileTests(file, optional = false) {
  if (optional && !fs.existsSync(file)) return [];
  try {
    return (await import(pathToFileURL(file).href)).default ?? [];
  } catch (error) {
    throw new Error(`suite failed to load: ${path.basename(file)}: ${String(error?.message || error)}`);
  }
}

async function loadSubmission(file) {
  const source = fs.readFileSync(file, "utf8");
  const context = createContext(
    {},
    {
      name: "poolproof-submission",
      codeGeneration: { strings: false, wasm: false },
    }
  );
  // Build no-op console functions inside the sandbox realm. Never inject a host
  // function/object, whose constructor chain could expose host capabilities.
  runInContext(
    "globalThis.console = Object.freeze({ log() {}, info() {}, warn() {}, error() {} })",
    context
  );
  // Capture the context's own JSON parser before candidate evaluation. Host
  // test objects are serialized and recreated in this realm, so the submission
  // never receives a host object whose constructor could escape the sandbox.
  const parseArgs = runInContext(
    "((parse) => (text) => parse(text))(JSON.parse.bind(JSON))",
    context
  );
  const candidate = new SourceTextModule(source, {
    context,
    identifier: pathToFileURL(file).href,
  });
  await candidate.link(async () => {
    throw new Error("submission imports are not allowed");
  });
  await candidate.evaluate({ timeout: 2_000 });

  const wrapped = Object.create(null);
  for (const key of Object.getOwnPropertyNames(candidate.namespace)) {
    const value = candidate.namespace[key];
    if (typeof value === "function") {
      Object.defineProperty(wrapped, key, {
        enumerable: true,
        value: (...args) => {
          const isolatedArgs = parseArgs(trustedStringify(args));
          const output = value(...isolatedArgs);
          if (output && typeof output.then === "function") {
            throw new Error("async submission exports are not supported");
          }
          return trustedClone(output);
        },
      });
    } else {
      Object.defineProperty(wrapped, key, {
        enumerable: true,
        value: trustedClone(value),
      });
    }
  }
  return Object.freeze(wrapped);
}

async function loadPrivateHoldouts() {
  const encoded = process.env.PP_HOLDOUT_B64;
  delete process.env.PP_HOLDOUT_B64;
  if (!encoded) return loadFileTests(path.resolve(specDir, "holdout.test.mjs"), true);

  const wordsUrl = pathToFileURL(path.resolve(specDir, "words.mjs")).href;
  const playUrl = pathToFileURL(path.resolve(specDir, "_play.mjs")).href;
  const source = Buffer.from(encoded, "base64")
    .toString("utf8")
    .replaceAll("__WORDS_URL__", wordsUrl)
    .replaceAll("__PLAY_URL__", playUrl);
  if (!source.includes("export default")) throw new Error("invalid private holdout payload");

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
  try {
    return (await import(moduleUrl)).default ?? [];
  } catch (error) {
    throw new Error(
      `private holdout payload failed to load for ${path.basename(specDir)}: ${String(error?.message || error)}`
    );
  }
}

// Load test definitions first. The submission imported below cannot read the
// deleted environment payload or reach these lexical bindings.
const suites = [
  { kind: "public", tests: await loadFileTests(path.resolve(specDir, "public.test.mjs")) },
  { kind: "holdout", tests: await loadPrivateHoldouts() },
];
const manifest = [];
for (const { kind, tests } of suites) {
  for (const test of tests) trustedPush(manifest, Object.freeze({ name: test.name, kind }));
}
Object.freeze(manifest);

// Silence ordinary submission output. The bound writer above remains private
// to this module and emits the sole authenticated result envelope.
process.stdout.write = () => true;

let mod;
let loadError = null;
try {
  mod = await loadSubmission(path.resolve(submissionEntry));
} catch (error) {
  loadError = error;
}

if (loadError) {
  const loadManifest = [Object.freeze({ name: "submission module loads", kind: "public" })];
  const loadResults = [
    {
      name: "submission module loads",
      kind: "public",
      status: "fail",
      detail: `could not import submission: ${trustedString(loadError?.message || loadError).slice(0, 300)}`,
    },
  ];
  emitSigned(loadManifest, loadResults);
} else {
  const results = [];
  for (const { kind, tests } of suites) {
    for (const test of tests) {
      try {
        await test.run(mod);
        trustedPush(results, { name: test.name, kind, status: "pass" });
      } catch (error) {
        trustedPush(results, {
          name: test.name,
          kind,
          status: "fail",
          detail: trustedString(error?.message || error).slice(0, 300),
        });
      }
    }
  }
  emitSigned(manifest, results);
}
