import type { Metadata, Viewport } from "next";
import { Lora, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext"],
});

const SITE_URL = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3001";

const DESCRIPTION = "Vánoční losování dárků. Sepiš přání, nech skupinu rozlosovat a obdaruj toho, koho ti los přidělí.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Tajný Ježíšek",
  description: DESCRIPTION,
  applicationName: "Tajný Ježíšek",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    siteName: "Tajný Ježíšek",
    title: "Tajný Ježíšek",
    description: DESCRIPTION,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tajný Ježíšek",
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#0E2A20",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${lora.variable} ${manrope.variable}`}>
      <body className="min-h-screen antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster theme="light" position="bottom-center" />
      </body>
    </html>
  );
}
