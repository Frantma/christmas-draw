import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Tajný Ježíšek",
  description: "Vánoční losování dárků pro rodinu a přátele.",
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
