// The allowed word universe for this spec. The harness picks answers from here
// and requires every guess to be a member. Includes the classic trap families
// (-atch, -ight) and double-letter words that break naive one-at-a-time solvers.
export default [
  // strong opening / probe words (many distinct common letters)
  "crane", "slate", "trace", "adieu", "audio", "roast", "saint", "noise",
  "stare", "least", "learn", "teach", "ocean", "plumb", "brick", "vault",
  "clamp", "whelp", "blimp", "chomp", "grime", "point", "dwarf", "mango",
  "flock", "gripe", "haunt", "joker", "vixen", "quilt", "zebra", "fjord",
  "waltz", "nymph", "crypt", "glyph",
  // common everyday answers
  "table", "chair", "house", "mouse", "bread", "clean", "dream", "green",
  "plant", "water", "world", "money", "music", "sound", "brave", "cloud",
  "storm", "flame", "frost", "grape", "lemon", "olive", "peach", "spice",
  "sugar", "toast", "wheat", "beach", "field", "glass", "heart", "image",
  "juice", "knife", "lodge", "north", "pride", "queen", "river", "smile",
  "tiger", "urban", "voice", "wagon", "youth", "actor", "boxer", "dance",
  "eagle", "fairy", "giant", "honey", "input", "jolly", "koala", "maple",
  // -atch trap family
  "batch", "catch", "hatch", "latch", "match", "patch", "watch",
  // -ight trap family
  "light", "might", "night", "sight", "tight", "fight", "right", "eight",
  // -ound trap family (large — breaks enumeration solvers)
  "bound", "found", "hound", "mound", "pound", "round", "sound", "wound",
  // double-letter traps
  "fluff", "puppy", "berry", "ferry", "funny", "sunny", "penny", "buddy",
  "daddy", "jazzy", "fuzzy", "vivid", "villa", "array", "abbey", "kayak",
];
