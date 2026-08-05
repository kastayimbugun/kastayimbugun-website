import type { Metadata } from "next";

/**
 * `/yonetim` ve altındaki her sayfa arama motorlarına kapalı
 * (docs/panel-kurallari.md §1: "/yonetim yollarına noindex").
 * Giriş sayfası da bu düzeni miras alır.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function YonetimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
