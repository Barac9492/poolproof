import { ImageResponse } from "next/og";
import { getProject, getLatestRun } from "@/lib/db";
import { buildRunGrid } from "@/lib/grid";

// Every shared pool link unfurls into the latest run's grid — the link
// preview IS the share artifact. Same rigid format as the in-page replay
// and the copyable text grid: public row, hidden row (squares, no names),
// verdict stating whether money moved.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Poolproof run result";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const INK = "#131a15";
const PAPER = "#f1f3ee";
const PINE = "#15633f";
const GREEN = "#2fbf80";
const RED = "#e05252";
const MUTED = "#3d4a42";

// color alone carries pass/fail — emoji/dingbat glyphs render as tofu in the
// OG rasterizer's default font, so the squares stay glyph-free
function Square({ pass }: { pass: boolean }) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 10,
        background: pass ? GREEN : RED,
        display: "flex",
      }}
    />
  );
}

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProject(slug);
  const run = p ? await getLatestRun(p.id) : null;
  const grid = p && run ? buildRunGrid(p.slug, run, run.results, run.builder) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: PAPER,
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: INK }}>
            <span>pool</span>
            <span style={{ color: PINE }}>proof</span>
            <span style={{ color: MUTED, marginLeft: 18, fontWeight: 400 }}>
              · {p ? p.slug : "not found"}
            </span>
          </div>
          {grid && (
            <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
              run #{grid.runId} · @{grid.builder}
            </div>
          )}
        </div>

        {grid ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 760 }}>
                {grid.publicCells.map((c, i) => (
                  <Square key={i} pass={c.pass} />
                ))}
              </div>
              <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
                public {grid.publicCells.filter((c) => c.pass).length}/{grid.publicCells.length}
              </div>
            </div>
            {grid.holdoutCells.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", maxWidth: 760 }}>
                  {grid.holdoutCells.map((c, i) => (
                    <Square key={i} pass={c.pass} />
                  ))}
                </div>
                <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
                  {grid.diedAtHoldout === null
                    ? `hidden ${grid.holdoutCells.length}/${grid.holdoutCells.length}`
                    : `hidden — died at holdout #${grid.diedAtHoldout}`}
                </div>
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: 64,
                fontWeight: 800,
                letterSpacing: -2,
                color: grid.green ? PINE : RED,
              }}
            >
              {grid.green ? "GREEN — money moved" : "RED — nothing moved"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div
              style={{
                display: "flex",
                fontSize: 58,
                fontWeight: 800,
                letterSpacing: -2,
                color: INK,
                lineHeight: 1.1,
                maxWidth: 1000,
              }}
            >
              {p ? p.title : "Pool not found"}
            </div>
            {p && (
              <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: MUTED }}>
                no run yet — nothing has moved
              </div>
            )}
          </div>
        )}

        <div style={{ display: "flex", fontSize: 26, color: MUTED }}>
          no reruns · hidden holdouts · logged forever
        </div>
      </div>
    ),
    size
  );
}
