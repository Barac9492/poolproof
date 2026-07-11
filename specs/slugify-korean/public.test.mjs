import assert from "node:assert/strict";

// Acceptance tests: Korean-aware slugify.
// Submission must export slugify(input: string): string
// Korean must be transliterated via Revised Romanization, not dropped —
// the long-standing gap in mainstream slugify libraries.

export default [
  {
    name: "romanizes plain Korean (안녕하세요 → annyeonghaseyo)",
    run: (mod) => {
      assert.equal(mod.slugify("안녕하세요"), "annyeonghaseyo");
    },
  },
  {
    name: "mixed Korean + English + spaces (안녕 world → annyeong-world)",
    run: (mod) => {
      assert.equal(mod.slugify("안녕 world"), "annyeong-world");
    },
  },
  {
    name: "does not silently drop Korean the way slugify@latest does",
    run: (mod) => {
      const out = mod.slugify("한글 제목");
      assert.ok(out.length > 0 && out !== "", "must not return empty");
      assert.ok(/^[a-z0-9-]+$/.test(out), "must be a clean ascii slug");
      assert.ok(out.includes("hangeul") || out.includes("hangul"), "한글 must romanize");
    },
  },
  {
    name: "lowercases, trims, collapses whitespace and punctuation to single dashes",
    run: (mod) => {
      assert.equal(mod.slugify("  Hello,   World!  "), "hello-world");
    },
  },
];
