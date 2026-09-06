import type { Metadata } from "next";

/**
 * Gerekçelerin tamamı kardeş rotada yazılı:
 * `src/app/(site)/rezervasyon-talebi/tesekkurler/layout.tsx`.
 *
 * Özet: `page.tsx` bir `"use client"` bileşeni olduğu için `metadata` oraya
 * yazılamaz; rota kapsamlı düzen aynı işi mimariyi bozmadan yapar.
 * `index: false` çünkü burası forma özel bir sonuç ekranı, `follow: true`
 * çünkü içindeki iç bağlantılar taranmaya devam etmeli.
 */
export const metadata: Metadata = {
  title: "Başvurunuz Alındı",
  description:
    "Villa başvurunuz bize ulaştı. Ekibimiz başvurunuzu değerlendirip en kısa sürede sizinle iletişime geçecek.",
  robots: { index: false, follow: true },
};

export default function ApplicationThanksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
