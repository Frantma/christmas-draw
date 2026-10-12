import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Obrázky se nahrávají přímo do Supabase Storage z prohlížeče,
  // server actions posílají jen text – výchozí limit 1 MB stačí.
};

export default nextConfig;
