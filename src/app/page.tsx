import DailyArena from "@/components/DailyArena";
import { messageTests, toPublicBattle } from "@/lib/battles";

function seoulDayKey() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const roomId = room && /^[A-Za-z0-9_-]{8}$/.test(room) ? room : undefined;

  return (
    <>
      <section className="detector-hero daily-hero">
        <div className="detector-copy">
          <div className="detector-badge"><span /> 사람 vs AI · 오늘의 베타 세트</div>
          <h1>사람과 AI,<br /><em>몇 개나 구별할까요?</em></h1>
          <p>출처가 확인된 사람 글과 같은 주제로 만든 AI 글을 나란히 보여드립니다. 감으로 고르고, 정답으로 점수를 확인하세요.</p>
          <div className="hero-actions">
            <a href="#play">오늘의 판별 시작 <span>→</span></a>
            <small>로그인 없이 바로 시작</small>
          </div>
          <div className="trust-row">
            <span>정답이 있는 게임</span><span>하루 한 판</span><span>친구 점수 대결</span>
          </div>
        </div>

        <div className="daily-proof-card" aria-label="결과 공유 예시">
          <header><span>오늘의 판별</span><b>결과 예시</b></header>
          <div className="proof-score"><strong>2</strong><span>/3</span></div>
          <h2>AI 냄새 사냥꾼</h2>
          <p>🟩🟥🟩</p>
          <div className="proof-rank"><span>단톡방 순위</span><strong>1위</strong><em>친구 평균 1.6</em></div>
          <div className="proof-cta">나는 2개. 너는? <span>↗</span></div>
        </div>
      </section>

      <section className="sample-heading" id="play">
        <p>{roomId ? "친구가 보낸 도전장" : "오늘의 판별"}</p>
        <h2>{roomId ? <>같은 문제로<br />점수를 겨뤄보세요.</> : <>사람이 쓴 문장을<br />골라보세요.</>}</h2>
        <span>{messageTests.length}문제를 모두 풀면 점수와 공유용 결과가 공개됩니다.</span>
      </section>
      <div className="arena-shell">
        <DailyArena
          battles={messageTests.map(toPublicBattle)}
          dayKey={seoulDayKey()}
          roomId={roomId}
        />
      </div>
    </>
  );
}
