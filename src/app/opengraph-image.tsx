import { ImageResponse } from "next/og";
import { COLORS, Star, loadOgFonts } from "@/lib/og";

export const alt = "Tajný Ježíšek – Kdo naděluje komu, ví jen Ježíšek.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Deterministické vločky
const FLAKES = Array.from({ length: 46 }, (_, i) => {
  const r = (k: number) => {
    const x = Math.sin((i + 3) * 12.9898 + k * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return { left: r(1) * 1200, top: r(2) * 520, size: 3 + r(3) * 6, opacity: 0.25 + r(4) * 0.5 };
});

const TREES = [
  [40, 90, 140, 30],
  [120, 160, 200, 60],
  [300, 350, 400, 20],
  [380, 415, 450, 70],
  [760, 810, 860, 40],
  [850, 885, 920, 80],
  [1010, 1060, 1110, 25],
  [1090, 1130, 1170, 70],
];

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: COLORS.pine900,
          color: COLORS.cream,
          fontFamily: "Manrope",
        }}
      >
        {FLAKES.map((f, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: f.left,
              top: f.top,
              width: f.size,
              height: f.size,
              borderRadius: 999,
              background: "#fff",
              opacity: f.opacity,
            }}
          />
        ))}

        <svg
          width="1200"
          height="160"
          viewBox="0 0 1200 140"
          preserveAspectRatio="none"
          style={{ position: "absolute", left: 0, bottom: 0 }}
        >
          {TREES.map(([a, b, c, top], i) => (
            <polygon key={i} points={`${a},140 ${b},${top} ${c},140`} fill={COLORS.pine800} />
          ))}
          <path d="M0 140 L0 112 Q300 92 600 110 T1200 104 L1200 140 Z" fill={COLORS.cream} opacity="0.92" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", padding: "72px 0 0 80px", width: 760 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <Star size={52} color={COLORS.gold} />
            <span style={{ fontFamily: "Lora", fontSize: 38 }}>Tajný Ježíšek</span>
          </div>
          <span
            style={{
              marginTop: 52,
              fontSize: 22,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: COLORS.goldLight,
            }}
          >
            Vánoční losování dárků
          </span>
          <span style={{ marginTop: 18, fontFamily: "Lora", fontSize: 72, lineHeight: 1.08 }}>
            Kdo naděluje komu, ví jen Ježíšek.
          </span>
          <span style={{ marginTop: 26, fontSize: 28, lineHeight: 1.45, color: "rgba(247,241,229,0.82)" }}>
            Sepiš přání, nech skupinu rozlosovat a obdaruj toho, koho ti los přidělí.
          </span>
        </div>

        <svg
          width="300"
          height="330"
          viewBox="0 0 200 220"
          style={{ position: "absolute", right: 110, top: 70 }}
        >
          <line x1="100" y1="0" x2="100" y2="44" stroke={COLORS.gold} strokeWidth="2" />
          <rect x="84" y="40" width="32" height="20" rx="4" fill={COLORS.gold} />
          <circle cx="100" cy="134" r="78" fill={COLORS.red} />
          <path d="M26 118 Q100 96 174 118" stroke={COLORS.goldLight} strokeWidth="5" fill="none" />
          <path d="M24 146 Q100 168 176 146" stroke={COLORS.goldLight} strokeWidth="5" fill="none" />
          <circle cx="60" cy="132" r="4" fill={COLORS.cream} />
          <circle cx="100" cy="134" r="5" fill={COLORS.cream} />
          <circle cx="140" cy="132" r="4" fill={COLORS.cream} />
          <circle cx="80" cy="133" r="3" fill={COLORS.cream} />
          <circle cx="120" cy="133" r="3" fill={COLORS.cream} />
          <ellipse cx="72" cy="96" rx="14" ry="22" fill="#fff" opacity="0.18" transform="rotate(30 72 96)" />
        </svg>
      </div>
    ),
    { ...size, fonts: await loadOgFonts() },
  );
}
