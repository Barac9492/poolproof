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
    default: "Poolproof — 사람과 AI, 몇 개나 구별할까요?",
    template: "%s · Poolproof",
  },
  description: "출처가 확인된 사람 글과 AI 글을 맞히고, 오늘의 점수를 친구들과 겨뤄보세요.",
  openGraph: {
    title: "사람과 AI, 몇 개나 구별할까요?",
    description: "오늘의 사람 vs AI 판별 게임. 점수를 확인하고 친구에게 도전장을 보내세요.",
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
              <Link href="/#play">오늘의 판별</Link>
              <Link href="/how">왜 믿을 수 있나요?</Link>
              <Link href="/submit">직접 문제 내기</Link>
            </nav>
            <Link href="/#play" className="header-login">오늘 게임 시작</Link>
          </div>
        </header>
        <main>{children}</main>
        <footer className="site-footer">
          <div><Mark /><p>정답이 있는 사람 vs AI 판별 게임.</p></div>
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
