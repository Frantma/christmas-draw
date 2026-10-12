import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
