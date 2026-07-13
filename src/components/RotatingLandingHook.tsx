"use client";

import { useEffect, useState } from "react";

const HOOKS = [
  { from: "썸남", via: "카톡" },
  { from: "썸녀", via: "DM" },
  { from: "업무", via: "이메일" },
  { from: "거래처", via: "이메일" },
  { from: "직원", via: "슬랙" },
  { from: "친구", via: "문자" },
];

export default function RotatingLandingHook() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % HOOKS.length), 2400);
    return () => window.clearInterval(timer);
  }, []);

  const hook = HOOKS[index];
  return (
    <h1 className="split-hook" aria-label={`${hook.from}, ${hook.via}. 이거 진짜일까?`}>
      <span className="split-board" aria-hidden="true">
        <span className="flap-column">
          <small>FROM</small>
          <b key={`from-${index}`}>{hook.from}</b>
        </span>
        <i>×</i>
        <span className="flap-column">
          <small>VIA</small>
          <b key={`via-${index}`}>{hook.via}</b>
        </span>
      </span>
      <em aria-hidden="true">이거, 진짜일까?</em>
    </h1>
  );
}
