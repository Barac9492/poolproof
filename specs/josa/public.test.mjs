import assert from "node:assert/strict";

// Acceptance tests: Korean postposition (조사) auto-selection.
// Submission must export josa(word, pair): string
//   josa("책", "은/는")  -> "책은"     (받침 있음)
//   josa("나무", "은/는") -> "나무는"    (받침 없음)
// Supported pairs: "은/는", "이/가", "을/를", "과/와", "아/야", "(으)로"
// Returns the word with the correct particle appended.

export default [
  {
    name: "은/는: 받침 있는 단어 -> 은",
    run: (mod) => assert.equal(mod.josa("책", "은/는"), "책은"),
  },
  {
    name: "은/는: 받침 없는 단어 -> 는",
    run: (mod) => assert.equal(mod.josa("나무", "은/는"), "나무는"),
  },
  {
    name: "이/가: 받침 있는 단어 -> 이",
    run: (mod) => assert.equal(mod.josa("홍길동", "이/가"), "홍길동이"),
  },
  {
    name: "이/가: 받침 없는 단어 -> 가",
    run: (mod) => assert.equal(mod.josa("철수", "이/가"), "철수가"),
  },
  {
    name: "을/를: 받침 있는 단어 -> 을",
    run: (mod) => assert.equal(mod.josa("밥", "을/를"), "밥을"),
  },
  {
    name: "을/를: 받침 없는 단어 -> 를",
    run: (mod) => assert.equal(mod.josa("사과", "을/를"), "사과를"),
  },
  {
    name: "과/와: 받침 있는 단어 -> 과",
    run: (mod) => assert.equal(mod.josa("책", "과/와"), "책과"),
  },
  {
    name: "과/와: 받침 없는 단어 -> 와",
    run: (mod) => assert.equal(mod.josa("바다", "과/와"), "바다와"),
  },
  {
    name: "아/야: 받침 있는 이름 -> 아",
    run: (mod) => assert.equal(mod.josa("길동", "아/야"), "길동아"),
  },
  {
    name: "아/야: 받침 없는 이름 -> 야",
    run: (mod) => assert.equal(mod.josa("영희", "아/야"), "영희야"),
  },
];
