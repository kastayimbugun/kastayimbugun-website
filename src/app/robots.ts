import type { MetadataRoute } from "next";
import { SITE_URL_UNUSABLE, absoluteUrl } from "@/lib/seo/urls";

/**
 * `/robots.txt`
 *
 * ── LİSTE NEDEN BU KADAR KISA ─────────────────────────────────────────────
 * Sitede indekslenmemesi gereken üç yer daha var — `/favoriler` ve iki teşekkür
 * sayfası — ama ÜÇÜ DE `robots: { index: false }` basıyor, o yüzden buraya
 * yazılmadılar. İki yöntem birlikte kullanılamaz: bir adres robots.txt ile
 * kapatılırsa tarayıcı sayfayı HİÇ İNDİREMEZ, dolayısıyla `noindex` etiketini de
 * göremez; dışarıdan tek bir bağlantı gelirse Google adresi içeriksiz olarak
 * yine listeleyebilir ("indexed, though blocked by robots.txt") ve o kaydı
 * kaldırmanın yolu kalmaz. `noindex` varken doğru davranış taramaya İZİN
 * VERMEKTİR.
 *
 * Bu dosya bu yüzden yalnızca `noindex` basamayan tek yeri kapatır: `/yonetim`.
 * Panelin kendisi de `noindex` basıyor ama oradaki asıl kazanç tarama bütçesi —
 * giriş duvarının arkasındaki onlarca rota boşuna taranmasın.
 *
 * Liste filtreli liste adreslerini (`?sirala=`, `?ozellik=` …) KAPATMAZ: onlar
 * canonical ile tek adrese toplanıyor (bkz. `src/lib/seo/urls.ts` → `listPath`).
 * Taramayı engellemek canonical'ın okunmasını da engellerdi.
 */

/**
 * ÜRETİMDE `SITE_URL` localhost ise `Sitemap:` satırı hiç yazılmaz.
 *
 * `NEXT_PUBLIC_SITE_URL` üretimde `http://localhost:3007` kalırsa (bkz.
 * `urls.ts`) satır `Sitemap: http://localhost:3007/sitemap.xml` olurdu; Google
 * bu adrese ulaşamaz ve farklı host'taki sitemap'i zaten reddeder. Satırı hiç
 * yazmamak, yanlış adres yazmaktan iyidir — kurallar (özellikle `/yonetim`
 * yasağı) yine de basılır, onlar mutlak adrese bağlı değil.
 *
 * `disallow: "/"` gibi bir "her şeyi kapat" davranışına GİDİLMEDİ: bir ortam
 * değişkeni hatası yüzünden tüm siteyi taramaya kapatmak, kırık bir sitemap
 * bağlantısından çok daha pahalıya patlar.
 */
const SITEMAP_UNUSABLE = SITE_URL_UNUSABLE;

export default function robots(): MetadataRoute.Robots {
  const file: MetadataRoute.Robots = {
    rules: {
      userAgent: "*",
      allow: "/",
      // Önek eşleşmesi: `/yonetim` altındaki tüm rotaları da kapsar.
      disallow: "/yonetim",
    },
  };

  if (!SITEMAP_UNUSABLE) {
    file.sitemap = absoluteUrl("/sitemap.xml");
  }

  return file;
}
