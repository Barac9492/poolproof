// Poolproof verification harness.
// Usage: node specs/_harness.mjs <specDir> <submissionEntry>
// Imports the submission module, runs every public + holdout acceptance test
// against it, and prints a JSON result array to stdout. Exit code 0 even on
// test failures — failures are data, not crashes. Non-zero only for harness
// errors (missing files, unparseable module).

import path from "node:path";
import { pathToFileURL } from "node:url";

const [specDir, submissionEntry] = process.argv.slice(2);
if (!specDir || !submissionEntry) {
  console.error("usage: node _harness.mjs <specDir> <submissionEntry>");
  process.exit(2);
}

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
for (const kind of ["public", "holdout"]) {
  let tests;
  try {
    tests = (await import(pathToFileURL(path.resolve(specDir, `${kind}.test.mjs`)).href)).default;
  } catch {
    continue; // spec has no tests of this kind
  }
  for (const t of tests) {
    try {
      await t.run(mod);
      results.push({ name: t.name, kind, status: "pass" });
    } catch (e) {
      results.push({
        name: t.name,
        kind,
        status: "fail",
        detail: String(e && e.message ? e.message : e).slice(0, 300),
      });
    }
  }
}

console.log(JSON.stringify(results));
