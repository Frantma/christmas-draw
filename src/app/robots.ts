import type { MetadataRoute } from "next";

// Procházení necháváme povolené: vyhledávače musí stránky načíst, aby viděly
// `noindex` (hlavička X-Robots-Tag + meta robots), a náhledy odkazů
// (Facebook, WhatsApp, X…) potřebují načíst OG obrázek.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" } };
}
