import BlindArena from "@/components/BlindArena";
import MessageTestForm from "@/components/MessageTestForm";
import RotatingLandingHook from "@/components/RotatingLandingHook";
import { messageTests, toPublicBattle } from "@/lib/battles";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ battle?: string; from?: string }>;
}) {
  const { battle, from } = await searchParams;
  const sharedSample = from === "friend" ? messageTests.find((item) => item.id === battle) : undefined;
  const visibleBattles = sharedSample ? [sharedSample] : messageTests;

  return (
    <>
      <section className="detector-hero">
        <div className="detector-copy">
          <div className="detector-badge"><span /> AI 냄새 테스트 · BETA</div>
          <RotatingLandingHook />
          <p>직접 쓴 진심인지, AI에게 부탁한 문장인지. 친구들과 익명으로 골라보세요.</p>
          <div className="hook-messages" aria-label="테스트할 수 있는 카톡 예시">
            <span>“ㅇㅇ 이따 전화할게”</span>
            <span>“오늘 진짜 재밌었어 ㅋㅋ”</span>
            <span>“아까는 내가 예민했나 봐. 미안해”</span>
          </div>
          <div className="trust-row">
            <span>확정 탐지 아님</span>
            <span>개인정보 자동 마스킹</span>
            <span>투표 후 정체 공개</span>
          </div>
        </div>
        <MessageTestForm />
      </section>

      <section className="sample-heading" id="sample">
        <p>{sharedSample ? "친구가 보낸 테스트" : "먼저 직접 골라보세요"}</p>
        <h2>{sharedSample ? <>친구와 같은 쪽을<br />고르게 될까요?</> : <>어느 쪽에서<br />사람 냄새가 나나요?</>}</h2>
        <span>한쪽은 실제 원문, 다른 쪽은 AI 대안입니다.</span>
      </section>
      <BlindArena battles={visibleBattles.map(toPublicBattle)} sharedBattle={Boolean(sharedSample)} hideIntro />
    </>
  );
}
