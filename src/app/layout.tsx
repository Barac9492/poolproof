import type { Metadata } from "next";
import Link from "next/link";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  metadataBase: new URL("https://poolproof.dev"),
  title: {
    default: "Poolproof — 썸남 카톡도, 업무 이메일도. 이거 진짜일까?",
    template: "%s · Poolproof",
  },
  description: "받은 메시지를 AI가 다시 쓴 문장과 익명으로 비교하세요. 사람들이 더 사람답다고 느끼는 쪽을 고른 뒤에만 원문을 공개합니다.",
  openGraph: {
    title: "썸남 카톡도, 업무 이메일도. 이거 진짜일까?",
    description: "한쪽은 원문, 한쪽은 AI. 더 사람이 직접 쓴 것 같은 메시지를 골라보세요.",
    siteName: "Poolproof",
    type: "website",
  },
};

function Mark() {
  return (
    <Link href="/" className="brand-mark" aria-label="Poolproof 홈">
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" fill="currentColor" />
        <path d="M9.5 16h13M16 9.5v13" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="16" cy="16" r="4.5" fill="#ff5c35" stroke="white" strokeWidth="1.8" />
      </svg>
      <span>poolproof</span>
      <em>beta</em>
    </Link>
  );
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className={cn("font-sans", geist.variable)}>
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Mark />
            <nav aria-label="주요 메뉴">
              <Link href="/">AI 냄새 테스트</Link>
              <Link href="/#sample">직접 골라보기</Link>
              <Link href="/how">이게 뭐예요?</Link>
            </nav>
            <Link href="/#message-input" className="header-login">메시지 테스트</Link>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div><Mark /><p>진심인가, 프롬프트인가. 사람들의 인상으로 비교합니다.</p></div>
          <nav>
            <Link href="/privacy">개인정보처리방침</Link>
            <Link href="/terms">이용약관</Link>
            <a href="https://github.com/Barac9492/poolproof" target="_blank" rel="noreferrer">GitHub</a>
          </nav>
          <span>© 2026 Poolproof</span>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
