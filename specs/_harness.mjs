// Poolproof verification harness.
// Usage: node specs/_harness.mjs <specDir> <submissionEntry>
// Loads private holdouts before importing untrusted submission code, deletes
// the one-time environment payload, then runs both suites in memory.

import path from "node:path";
import { pathToFileURL } from "node:url";

const [specDir, submissionEntry] = process.argv.slice(2);
if (!specDir || !submissionEntry) {
  console.error("usage: node _harness.mjs <specDir> <submissionEntry>");
  process.exit(2);
}

async function loadFileTests(file, optional = false) {
  try {
    return (await import(pathToFileURL(file).href)).default ?? [];
  } catch (error) {
    if (optional) return [];
    throw new Error(`suite failed to load: ${path.basename(file)}: ${String(error?.message || error)}`);
  }
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

let mod;
try {
  mod = await import(pathToFileURL(path.resolve(submissionEntry)).href);
} catch (e) {
  console.log(
    JSON.stringify([
      {
        name: "submission module loads",
        kind: "public",
        status: "fail",
        detail: `could not import submission: ${String(e.message).slice(0, 300)}`,
      },
    ])
  );
  process.exit(0);
}

const results = [];
for (const { kind, tests } of suites) {
  for (const test of tests) {
    try {
      await test.run(mod);
      results.push({ name: test.name, kind, status: "pass" });
    } catch (e) {
      results.push({
        name: test.name,
        kind,
        status: "fail",
        detail: String(e && e.message ? e.message : e).slice(0, 300),
      });
    }
  }
}

console.log(JSON.stringify(results));
