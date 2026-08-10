import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

import { getSiteSettings } from "@/lib/data/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const icon = site.faviconImage || "/favicon.ico";
  const title = site.brandName
    ? `${site.brandName} — Kiralık Lüks Villalar`
    : "Kastayım Bugün Villaları — Kiralık Lüks Villalar";

  return {
    title,
    description:
      site.seoDescriptionTr ||
      "Türkiye'nin dört bir yanında özel havuzlu, deniz manzaralı seçkin kiralık villalar. Kalkan, Kaş, Fethiye, Bodrum ve daha fazlası.",
    icons: {
      icon: icon,
      shortcut: icon,
      apple: icon,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#2a1a0e]">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
