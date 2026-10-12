import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server jde otevřít i z telefonu v místní síti (http://<IP Macu>:3001).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  // Soukromá rodinná aplikace – nesmí se objevit ve vyhledávačích.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" }],
      },
    ];
  },
};

export default nextConfig;
