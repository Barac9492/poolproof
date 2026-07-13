import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <p className="font-mono text-5xl font-bold text-faint">404</p>
      <h1 className="mt-3 text-xl font-semibold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-muted">
        대결이 끝났거나 주소가 잘못되었을 수 있어요.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg bg-black px-4 py-2 text-xs font-semibold text-white"
      >
        ← 대결로 돌아가기
      </Link>
    </div>
  );
}
