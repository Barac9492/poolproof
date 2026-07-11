import assert from "node:assert/strict";
import WORDS from "./words.mjs";
import { play } from "./_play.mjs";

// Acceptance tests: a Wordle solver.
// Submission must export nextGuess(history, words): string
//   history: [{ guess: "slate", feedback: "bygbb" }, ...]  (g=correct spot, y=in word, b=absent)
//   words:   the allowed word list (guesses MUST be a member)
//   returns: the next 5-letter guess. First call gets history = [].
// Goal: solve the hidden answer in 6 guesses or fewer, using only feedback.
// The harness holds the answer — the solver never sees it.

const solves = (answer) => (mod) => {
  const r = play(mod, answer, WORDS);
  assert.ok(r.solved, `did not solve "${answer}" — ${r.reason || `used ${r.guesses} guesses`}`);
};

export default [
  { name: "solves 'plant' in ≤6", run: solves("plant") },
  { name: "solves 'storm' in ≤6", run: solves("storm") },
  { name: "solves 'voice' in ≤6", run: solves("voice") },
  { name: "solves 'grape' in ≤6", run: solves("grape") },
  { name: "solves 'eagle' in ≤6", run: solves("eagle") },
  { name: "solves 'brick' in ≤6", run: solves("brick") },
];
