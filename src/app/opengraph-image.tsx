import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "Poolproof — money moves only on green";
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
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#131a15",
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
                background: "#2fbf80",
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
          <div style={{ fontSize: 84, fontWeight: 800, color: "#131a15", lineHeight: 1.05, letterSpacing: -3 }}>
            Fund outcomes,
          </div>
          <div style={{ fontSize: 84, fontWeight: 800, color: "#15633f", lineHeight: 1.05, letterSpacing: -3 }}>
            not attempts.
          </div>
        </div>
        <div style={{ fontSize: 30, color: "#3d4a42" }}>
          Escrow releases only when every acceptance test passes a real CI run.
        </div>
      </div>
    ),
    size
  );
}
