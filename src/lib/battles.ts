export type Battle = {
  id: string;
  category: string;
  eyebrow: string;
  prompt: string;
  context?: string;
  optionA: { model: string; text: string };
  optionB: { model: string; text: string };
  seedA: number;
  seedB: number;
  source: "sample" | "live";
  mode?: "ai_duel" | "human_test";
};

export type PublicBattle = Omit<Battle, "optionA" | "optionB"> & {
  optionA: { text: string };
  optionB: { text: string };
};

export function toPublicBattle(battle: Battle): PublicBattle {
  return {
    ...battle,
    optionA: { text: battle.optionA.text },
    optionB: { text: battle.optionB.text },
  };
}

export const battles: Battle[] = [
  {
    id: "samhaengsi-developer",
    category: "말장난",
    eyebrow: "오늘의 블라인드 대결",
    prompt: "‘개발자’로 삼행시를 지어줘",
    optionA: {
      model: "큐레이션 A",
      text: "개운하게 눈을 떴다\n발밑에는 노트북이 있고\n자정 배포가 기다린다",
    },
    optionB: {
      model: "큐레이션 B",
      text: "개발은 끝났다고 말했다\n발견된 버그 하나 때문에\n자는 건 다음 생으로 미뤘다",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
  },
  {
    id: "first-date-message",
    category: "연애",
    eyebrow: "보내기 전에 골라봐",
    prompt: "첫 데이트가 좋았다는 카톡을 써줘",
    context: "부담스럽지 않게, 하지만 다음 약속으로 이어지게.",
    optionA: {
      model: "큐레이션 A",
      text: "오늘 생각보다 시간이 너무 빨리 갔어요. 다음엔 제가 맛있는 곳 찾아볼게요 :) 조심히 들어가요!",
    },
    optionB: {
      model: "큐레이션 B",
      text: "오늘 덕분에 많이 웃었어요. 아까 말한 그 전시, 다음 주에 같이 보러 갈래요? 들어가면 알려줘요.",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
  },
  {
    id: "late-work-refusal",
    category: "회사생활",
    eyebrow: "직장인의 선택",
    prompt: "퇴근 직전 추가 업무를 정중하게 거절해줘",
    context: "내일 오전까지 해도 되는 업무입니다.",
    optionA: {
      model: "큐레이션 A",
      text: "확인했습니다. 지금 시작하면 검토 없이 전달될 가능성이 있어, 내일 오전 우선순위로 진행해 11시까지 공유드리겠습니다.",
    },
    optionB: {
      model: "큐레이션 B",
      text: "요청 감사합니다. 금일 근무시간 내 완료는 어려울 것 같습니다. 내일 오전 중 처리해 전달드려도 괜찮을까요?",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
  },
  {
    id: "apology-message",
    category: "인간관계",
    eyebrow: "어느 쪽이 더 진심 같아?",
    prompt: "약속을 깜빡한 친구에게 사과해줘",
    optionA: {
      model: "큐레이션 A",
      text: "내가 오늘 약속을 완전히 놓쳤어. 기다리게 한 것도, 먼저 연락하게 한 것도 정말 미안해. 변명하지 않을게. 이번 주 중 네가 편한 날에 내가 제대로 사과하고 싶어.",
    },
    optionB: {
      model: "큐레이션 B",
      text: "진짜 미안해 ㅠㅠ 정신이 없어서 약속을 깜빡했어. 다음엔 절대 이런 일 없게 할게. 내가 밥 살 테니까 화 풀어줘!",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
  },
  {
    id: "rainy-day-copy",
    category: "카피",
    eyebrow: "한 줄 승부",
    prompt: "비 오는 날 배달앱을 열게 만드는 한 줄을 써줘",
    optionA: {
      model: "큐레이션 A",
      text: "비는 오고, 전은 이미 출발했습니다.",
    },
    optionB: {
      model: "큐레이션 B",
      text: "오늘 같은 날엔 빗소리보다 먼저 치킨 벨이 울려야 하니까.",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
  },
  {
    id: "error-explanation",
    category: "개발",
    eyebrow: "설명력 대결",
    prompt: "‘undefined is not a function’을 초보자에게 설명해줘",
    optionA: {
      model: "큐레이션 A",
      text: "전화번호라고 생각하고 전화를 걸었는데, 그 자리에 번호가 아니라 빈 종이가 있었던 상황입니다. 실행하려는 값이 정말 함수인지 먼저 확인해보세요.",
    },
    optionB: {
      model: "큐레이션 B",
      text: "코드가 어떤 값을 함수처럼 호출했지만, 실제로는 그 값이 존재하지 않는다는 뜻입니다. 함수 이름의 오타나 import 경로부터 확인하세요.",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
  },
];

export const messageTests: Battle[] = [
  {
    id: "message-apology",
    category: "연애",
    eyebrow: "AI 냄새 테스트",
    prompt: "이 사과 메시지, 어느 쪽이 사람이 직접 쓴 것 같나요?",
    context: "한쪽은 원문이고, 다른 쪽은 AI가 같은 뜻으로 다시 썼습니다.",
    optionA: {
      model: "원문",
      text: "아까 내가 말 너무 세게 한 것 같아. 집에 오는 길에 계속 마음에 걸렸어. 네 기분 생각 못하고 내 말만 해서 미안해.",
    },
    optionB: {
      model: "AI 대안",
      text: "아까 감정적으로 말해서 미안해. 네 입장을 충분히 생각하지 못했던 것 같아. 앞으로는 더 신중하게 이야기할게.",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
    mode: "human_test",
  },
  {
    id: "message-employee",
    category: "회사",
    eyebrow: "AI 냄새 테스트",
    prompt: "이 업무 메시지, 어느 쪽이 사람이 직접 쓴 것 같나요?",
    context: "한쪽은 원문이고, 다른 쪽은 AI가 같은 뜻으로 다시 썼습니다.",
    optionA: {
      model: "AI 대안",
      text: "요청하신 자료는 오늘 오후 3시까지 정리해 공유드리겠습니다. 추가로 확인이 필요한 부분은 별도로 표시해두겠습니다.",
    },
    optionB: {
      model: "원문",
      text: "자료는 오늘 3시 전까지 정리해서 드릴게요. 보다 보니 애매한 부분이 두 군데 있어서 그건 표시해두겠습니다.",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
    mode: "human_test",
  },
  {
    id: "message-first-date",
    category: "소개팅",
    eyebrow: "AI 냄새 테스트",
    prompt: "이 데이트 후 메시지, 어느 쪽이 사람이 직접 쓴 것 같나요?",
    context: "한쪽은 원문이고, 다른 쪽은 AI가 같은 뜻으로 다시 썼습니다.",
    optionA: {
      model: "원문",
      text: "오늘 생각보다 시간이 진짜 빨리 갔네요 ㅋㅋ 아까 얘기한 전시 찾아봤는데 다음 주말에도 하더라고요.",
    },
    optionB: {
      model: "AI 대안",
      text: "오늘 정말 즐거웠어요! 시간 가는 줄 몰랐네요. 아까 말씀하신 전시도 함께 보러 가면 좋을 것 같아요.",
    },
    seedA: 0,
    seedB: 0,
    source: "sample",
    mode: "human_test",
  },
];

export function getBattle(id: string) {
  return [...battles, ...messageTests].find((battle) => battle.id === id);
}
