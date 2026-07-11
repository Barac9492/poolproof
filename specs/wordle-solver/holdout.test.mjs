import assert from "node:assert/strict";
import WORDS from "./words.mjs";
import { play } from "./_play.mjs";

// Holdout tests: not shown to builders. The boss fight. A naive "guess the first
// remaining candidate" solver burns >6 guesses on large trap families (-atch,
// -ound) and mishandles double-letter feedback. Only a real information-maximizing
// solver survives. Every answer here is solvable in ≤5 by a good solver.

const solves = (answer) => (mod) => {
  const r = play(mod, answer, WORDS);
  assert.ok(r.solved, `did not solve "${answer}" — ${r.reason || `used ${r.guesses} guesses`}`);
};

export default [
  { name: "holdout: solves 'watch' (-atch trap) in ≤6", run: solves("watch") },
  { name: "holdout: solves 'mound' (-ound trap) in ≤6", run: solves("mound") },
  { name: "holdout: solves 'wound' (-ound trap) in ≤6", run: solves("wound") },
  { name: "holdout: solves 'night' (-ight trap) in ≤6", run: solves("night") },
  { name: "holdout: solves 'jazzy' (double-letter) in ≤6", run: solves("jazzy") },
];
