import type { CSSProperties } from "react";

/** Deterministické vločky – stejné na serveru i v prohlížeči. */
function makeFlakes(count: number, seed: number) {
  return Array.from({ length: count }, (_, i) => {
    const r = (k: number) => {
      const x = Math.sin((i + seed) * 12.9898 + k * 78.233) * 43758.5453;
      return x - Math.floor(x);
    };
    const size = (2 + r(2) * 4).toFixed(1) + "px";
    return {
      left: (r(1) * 100).toFixed(1) + "%",
      width: size,
      height: size,
      opacity: Number((0.3 + r(5) * 0.5).toFixed(2)),
      animationDuration: (10 + r(3) * 14).toFixed(1) + "s",
      animationDelay: (-r(4) * 24).toFixed(1) + "s",
    } satisfies CSSProperties;
  });
}

export function Snow({ count = 22, seed = 7 }: { count?: number; seed?: number }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {makeFlakes(count, seed).map((style, i) => (
        <span key={i} className="flake" style={style} />
      ))}
    </div>
  );
}
