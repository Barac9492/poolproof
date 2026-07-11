// Wordle feedback + game driver used by the acceptance tests.
// The harness holds the answer; the solver only ever sees feedback, so it
// cannot cheat by reading the answer.

// score("crate", "trace") -> "byygg"  (g=green/correct spot, y=yellow/in word, b=absent)
// Correct duplicate-letter handling: greens claimed first, then yellows from the
// remaining answer letters.
export function score(guess, answer) {
  const res = Array(5).fill("b");
  const a = answer.split("");
  for (let i = 0; i < 5; i++) {
    if (guess[i] === a[i]) {
      res[i] = "g";
      a[i] = null;
    }
  }
  for (let i = 0; i < 5; i++) {
    if (res[i] === "g") continue;
    const j = a.indexOf(guess[i]);
    if (j !== -1) {
      res[i] = "y";
      a[j] = null;
    }
  }
  return res.join("");
}

// Drive a full game. Calls mod.nextGuess(history, words) up to 6 times.
// Returns { solved, guesses, reason }.
export function play(mod, answer, words) {
  if (typeof mod.nextGuess !== "function") {
    return { solved: false, guesses: 0, reason: "submission must export nextGuess(history, words)" };
  }
  const history = [];
  const wordSet = new Set(words);
  for (let turn = 1; turn <= 6; turn++) {
    let guess;
    try {
      guess = mod.nextGuess(history.slice(), words);
    } catch (e) {
      return { solved: false, guesses: turn, reason: `nextGuess threw: ${String(e).slice(0, 80)}` };
    }
    if (typeof guess !== "string" || !wordSet.has(guess)) {
      return { solved: false, guesses: turn, reason: `illegal guess ${JSON.stringify(guess)} (must be a word from the list)` };
    }
    const feedback = score(guess, answer);
    history.push({ guess, feedback });
    if (feedback === "ggggg") return { solved: true, guesses: turn };
  }
  return { solved: false, guesses: 6, reason: "not solved within 6 guesses" };
}
