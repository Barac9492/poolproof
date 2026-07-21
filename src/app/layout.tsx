import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { getBalance } from "@/lib/db";
import { logoutAction } from "@/lib/actions";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://poolproof.dev"),
  title: {
    default: "Poolproof | AI 바운티, 숨은 테스트로 자동 검증",
    template: "%s",
  },
  description:
    "AI로 해결할 문제를 크레딧 바운티로 올리고, 공개 테스트와 비공개 홀드아웃을 모두 통과한 결과에만 보상합니다.",
  openGraph: {
    title: "Poolproof | AI 바운티, 숨은 테스트로 자동 검증",
    description:
      "프롬프트 한 개, 실행 한 번. 비공개 홀드아웃까지 통과한 결과에만 크레딧 바운티가 지급됩니다.",
    siteName: "Poolproof",
    type: "website",
  },
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="h-6 w-6" aria-hidden>
        <rect width="64" height="64" rx="16" className="fill-ink" />
        <circle cx="32" cy="34" r="16" fill="none" strokeWidth="5" className="stroke-paper-deep" />
        <path
          d="M23 34.5l6.5 6.5L42 28"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-[#2fbf80]"
        />
      </svg>
      <span className="text-[15px] font-bold tracking-tight text-ink">
        pool<span className="text-pine">proof</span>
      </span>
    </Link>
  );
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const balance = user ? await getBalance(user.handle) : null;

  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-paper text-ink">
        <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-y-2 px-5 py-3.5">
            <Logo />
            <nav className="flex items-center gap-4 text-[13px] font-medium text-ink-soft sm:gap-5">
              <Link href="/" className="transition hover:text-ink">
                바운티
              </Link>
              <Link
                href="/oneshot"
                className="inline-flex items-center gap-1.5 rounded-full border border-pine/30 bg-pine-wash px-2.5 py-1 text-[12.5px] font-semibold text-pine-deep transition hover:border-pine/50"
              >
                ⚡ 원샷
              </Link>
              <Link href="/how" className="hidden transition hover:text-ink sm:inline">
                How it works
              </Link>
              <Link href="/docs" className="hidden transition hover:text-ink sm:inline">
                Docs
              </Link>
              <Link
                href="/submit"
                className="rounded-lg bg-pine px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-pine-deep"
              >
                바운티 올리기
              </Link>
              {user ? (
                <span className="flex items-center gap-2.5">
                  <Link
                    href="/credits"
                    className="rounded-full border border-line bg-card px-2.5 py-1 font-mono text-[12px] font-semibold text-ink transition hover:border-line-strong"
                    title="Credit balance"
                  >
                    {balance?.toLocaleString()} cr
                  </Link>
                  <Link href="/me" className="font-semibold text-pine hover:underline">
                    @{user.handle}
                  </Link>
                  <form action={logoutAction}>
                    <button type="submit" className="text-faint transition hover:text-ink" title="Sign out">
                      ⏻
                    </button>
                  </form>
                </span>
              ) : (
                <Link href="/login" className="transition hover:text-ink">
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-5 py-10">{children}</main>
        <footer className="border-t border-line bg-paper-deep/40 px-5 py-10">
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
              <div>
                <Logo />
                <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-muted">
                  Pledges sit in escrow, released only when every test passes a real CI run. No
                  green by the deadline → full refund.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-10 gap-y-2 text-[12.5px] font-medium text-muted sm:flex sm:gap-5">
                <Link href="/docs" className="hover:text-ink">
                  Docs
                </Link>
                <Link href="/how" className="hover:text-ink">
                  Mechanism
                </Link>
                <a
                  href="https://github.com/Barac9492/poolproof/discussions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  Community
                </a>
                <a
                  href="https://github.com/Barac9492/poolproof"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink"
                >
                  GitHub
                </a>
                <Link href="/terms" className="hover:text-ink">
                  Terms
                </Link>
                <Link href="/refunds" className="hover:text-ink">
                  Refunds
                </Link>
                <Link href="/privacy" className="hover:text-ink">
                  Privacy
                </Link>
              </div>
            </div>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-[11px] tracking-wide text-faint">
                not equity · not tokens · funding verified outcomes — public beta
              </p>
              <a
                href="https://github.com/Barac9492/poolproof/discussions/new?category=general"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-line bg-card px-3 py-1 font-mono text-[11px] text-muted transition hover:border-line-strong hover:text-ink"
              >
                ✍ send feedback
              </a>
            </div>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
