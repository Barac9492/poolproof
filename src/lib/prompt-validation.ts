const LINE_COUNTS: Record<string, number> = {
  이: 2,
  삼: 3,
  사: 4,
  오: 5,
  육: 6,
};

const KOREAN_NUMBERS = ["", "한", "두", "세", "네", "다섯", "여섯"];

export function validateBattlePrompt(prompt: string): string | null {
  const acrostic = prompt.match(/[‘'"“]([^’'"”]{1,12})[’'"”].*?([이삼사오육])행시/);
  if (!acrostic) return null;

  const word = Array.from(acrostic[1].replace(/\s/g, ""));
  const requested = LINE_COUNTS[acrostic[2]];
  if (word.length === requested) return null;

  const correctLabel = Object.entries(LINE_COUNTS).find(([, count]) => count === word.length)?.[0];
  if (!correctLabel) return `‘${acrostic[1]}’의 글자 수와 요청한 행시 수가 맞지 않아요.`;
  return `‘${acrostic[1]}’은 ${KOREAN_NUMBERS[word.length]} 글자라 ${correctLabel}행시가 맞아요.`;
}
