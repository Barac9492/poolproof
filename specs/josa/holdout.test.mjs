import assert from "node:assert/strict";

// Holdout tests: not shown to builders. These catch the classic 조사 mistakes
// that a naive "받침 있음/없음" toggle gets wrong — the whole reason this
// library is worth funding.

export default [
  {
    name: "holdout: (으)로 받침 없음 -> 로",
    run: (mod) => assert.equal(mod.josa("회사", "(으)로"), "회사로"),
  },
  {
    name: "holdout: (으)로 일반 받침 -> 으로",
    run: (mod) => assert.equal(mod.josa("부산", "(으)로"), "부산으로"),
  },
  {
    name: "holdout: (으)로 ㄹ받침 예외 -> 로 (NOT 으로)",
    run: (mod) => assert.equal(mod.josa("서울", "(으)로"), "서울로"),
  },
  {
    name: "holdout: 비한글 종결 -> 받침 없음으로 처리 (GitHub -> 가)",
    run: (mod) => assert.equal(mod.josa("GitHub", "이/가"), "GitHub가"),
  },
  {
    name: "holdout: ㄹ받침 은/는은 정상 처리 (서울 -> 은)",
    run: (mod) => assert.equal(mod.josa("서울", "은/는"), "서울은"),
  },
];
