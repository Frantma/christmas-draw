import { ImageResponse } from "next/og";
import { COLORS, Star } from "@/lib/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: COLORS.pine900,
        }}
      >
        <Star size={124} color={COLORS.gold} />
      </div>
    ),
    size,
  );
}
