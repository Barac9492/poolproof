import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Poolproof — 썸남 카톡도, 업무 이메일도. 이거 진짜일까?";
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
          background: "#f7f7f5",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#171714",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 22,
                height: 22,
                borderRadius: 22,
                background: "#ff5c35",
                display: "flex",
              }}
            />
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#131a15" }}>
            <span>pool</span>
            <span style={{ color: "#15633f" }}>proof</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 78, fontWeight: 800, color: "#171714", lineHeight: 1.08, letterSpacing: -4 }}>
            썸남 카톡도, 업무 이메일도.
          </div>
          <div style={{ fontSize: 78, fontWeight: 800, color: "#ff5c35", lineHeight: 1.08, letterSpacing: -4 }}>
            이거 진짜일까?
          </div>
        </div>
        <div style={{ fontSize: 30, color: "#55554f" }}>
          한쪽은 원문, 한쪽은 AI. 사람 냄새가 나는 쪽을 골라봐.
        </div>
      </div>
    ),
    size
  );
}
