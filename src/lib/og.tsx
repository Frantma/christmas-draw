import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const STAR_PATH = "M12 1.5l2.6 7.1 7.4.5-5.8 4.7 1.9 7.3L12 17l-6.1 4.1 1.9-7.3L2 9.1l7.4-.5z";

export const COLORS = {
  pine900: "#0E2A20",
  pine800: "#163B2D",
  gold: "#C9A14A",
  goldLight: "#E2C578",
  cream: "#F7F1E5",
  red: "#A8232E",
};

/** Písma pro ImageResponse – latin + latin-ext kvůli české diakritice. */
export async function loadOgFonts() {
  const file = (pkg: string, name: string) => readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", name));
  const [lora, loraExt, manrope, manropeExt] = await Promise.all([
    file("lora", "lora-latin-600-normal.woff"),
    file("lora", "lora-latin-ext-600-normal.woff"),
    file("manrope", "manrope-latin-500-normal.woff"),
    file("manrope", "manrope-latin-ext-500-normal.woff"),
  ]);
  return [
    { name: "Lora", data: lora, weight: 600 as const, style: "normal" as const },
    { name: "Lora", data: loraExt, weight: 600 as const, style: "normal" as const },
    { name: "Manrope", data: manrope, weight: 500 as const, style: "normal" as const },
    { name: "Manrope", data: manropeExt, weight: 500 as const, style: "normal" as const },
  ];
}

export function Star({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d={STAR_PATH} fill={color} />
    </svg>
  );
}
