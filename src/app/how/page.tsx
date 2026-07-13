import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "왜 믿을 수 있나요?" };

export default function HowPage() {
  return (
    <div className="simple-page how-page">
      <Link href="/" className="back-link">← 홈으로 돌아가기</Link>
      <p className="page-kicker">HOW IT WORKS</p>
      <h1>모르는 글은 판정하지 않습니다.<br />정답이 있는 문제만 냅니다.</h1>
      <p className="page-copy">실제 메시지를 넣고 AI 여부를 추측하는 탐지기가 아닙니다. 사람이 직접 작성했다고 확인된 글과 같은 주제로 생성한 AI 글만 문제로 만들기 때문에, 선택이 끝나면 확정된 정답으로 채점할 수 있습니다.</p>
      <div className="how-large-grid">
        <article><span>01</span><h2>확인해요</h2><p>사람이 직접 작성하고 AI를 사용하지 않았다고 확인한 글만 후보로 받습니다.</p></article>
        <article><span>02</span><h2>짝을 만들어요</h2><p>같은 주제와 조건으로 AI 글을 생성해 비교 가능한 한 쌍을 만듭니다.</p></article>
        <article><span>03</span><h2>출처를 가려요</h2><p>사람과 AI의 위치를 숨긴 뒤, 더 사람이 쓴 것 같은 문장을 고르게 합니다.</p></article>
        <article><span>04</span><h2>정답으로 채점해요</h2><p>선택 후 출처와 점수를 공개하고, 같은 문제로 친구들과 겨룰 수 있습니다.</p></article>
      </div>
      <Link href="/#play" className="big-link">오늘의 판별 시작 <span>→</span></Link>
    </div>
  );
}
