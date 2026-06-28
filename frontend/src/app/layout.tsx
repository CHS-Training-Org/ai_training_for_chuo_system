import type { Metadata } from "next";
import { Inter, Noto_Sans_JP } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansJP = Noto_Sans_JP({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookFlow",
  description: "施設・備品予約システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${notoSansJP.variable}`}>
      <body>
        {children}
        {/* トースト通知（sonner）。shadcn/ui の toast は非推奨のため sonner を採用 */}
        <Toaster richColors closeButton />
      </body>
    </html>
  );
}
