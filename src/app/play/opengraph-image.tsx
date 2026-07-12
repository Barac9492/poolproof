import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "오늘의 판별 — 사람일까, AI일까?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f1f3ee",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 44 }}>🕵</div>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#131a15" }}>
            <span>pool</span>
            <span style={{ color: "#15633f" }}>proof</span>
            <span style={{ color: "#6d7a70", fontWeight: 500 }}> · 오늘의 판별</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 78, fontWeight: 800, color: "#131a15", lineHeight: 1.05, letterSpacing: -3 }}>
            사람이 썼을까,
          </div>
          <div style={{ fontSize: 78, fontWeight: 800, color: "#15633f", lineHeight: 1.05, letterSpacing: -3 }}>
            AI가 썼을까?
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 28, color: "#3d4a42" }}>글 10개, 하루 한 판. 당신은 몇 개 맞힐까요?</div>
          <div style={{ fontSize: 30, letterSpacing: 4 }}>🟩🟥🟩🟩🟥</div>
        </div>
      </div>
    ),
    size
  );
}
