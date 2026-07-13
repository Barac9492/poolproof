import type { Metadata } from "next";
import Link from "next/link";
import MessageTestForm from "@/components/MessageTestForm";

export const metadata: Metadata = { title: "AI 냄새 테스트 만들기" };

export default function SubmitPage() {
  return (
    <div className="simple-page create-page">
      <Link href="/" className="back-link">← 홈으로 돌아가기</Link>
      <p className="page-kicker">AI SMELL TEST</p>
      <h1>이 메시지,<br />사람이 썼을까요?</h1>
      <p className="page-copy">원문과 AI 대안을 익명으로 붙이고, 사람들이 어느 쪽을 더 사람답다고 느끼는지 확인하세요.</p>
      <MessageTestForm />
    </div>
  );
}
