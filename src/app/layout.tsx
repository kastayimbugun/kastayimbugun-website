import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRegions } from "@/lib/data/villas";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Kastayım Bugün Villaları — Kiralık Lüks Villalar",
  description:
    "Türkiye'nin dört bir yanında özel havuzlu, deniz manzaralı seçkin kiralık villalar. Kalkan, Kaş, Fethiye, Bodrum ve daha fazlası.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const regions = await getRegions();

  return (
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#2a1a0e]">
        <I18nProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer regions={regions} />
        </I18nProvider>
      </body>
    </html>
  );
}
