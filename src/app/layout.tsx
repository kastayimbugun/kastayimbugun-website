import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/lib/i18n";

import { getSiteSettings } from "@/lib/data/site";
import { SITE_URL, SITE_URL_UNUSABLE } from "@/lib/seo/urls";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"], // ğ ş İ Ğ Ş latin-ext altkümesinde,
});

/**
 * Panel boş bırakıldığında kullanılan son çare metinler.
 *
 * ARCHITECTURE.md §7 kullanıcıya görünen metni koda gömmeyi yasaklıyor; bunlar
 * bilerek istisna: `<title>` ve `<meta description>` i18n context'inden
 * (`"use client"`) okunamaz ve ayar okunamadığında sayfanın başlıksız kalması
 * daha kötüdür. Doğru çözüm bu alanları panelden doldurmaktır.
 */
const FALLBACK_BRAND = "Kastayım Bugün Villaları";
const FALLBACK_DESCRIPTION =
  "Türkiye'nin dört bir yanında özel havuzlu, deniz manzaralı seçkin kiralık villalar. Kalkan, Kaş, Fethiye, Bodrum ve daha fazlası.";

/**
 * ÜRETİMDE `SITE_URL` localhost ise mutlak adrese bağlı alanlar BASILMAZ.
 *
 * `NEXT_PUBLIC_SITE_URL` üretimde `http://localhost:3007` kalırsa (bkz.
 * `src/lib/seo/urls.ts` içindeki açık risk notu) `metadataBase` localhost olur
 * ve HİÇBİR HATA VERMEZ: bütün canonical'lar, `og:url` ve göreli OG görselleri
 * sessizce Google'ın erişemediği bir adresi gösterir. Paylaşım önizlemeleri boş
 * çıkar, canonical'lar kendi kendini çürütür.
 *
 * KARAR: yanlış mutlak adres basmaktansa hiç basmamak. Bu durumda
 * `metadataBase` ve `og:url` atlanır; OG görseli yalnızca ZATEN mutlak ise
 * (Supabase Storage adresi — `imageUrl()` çıktısı) basılır, çünkü o adres site
 * kökünden bağımsız olarak doğrudur. Başlık, açıklama, favicon ve `robots`
 * etkilenmez — hiçbiri mutlak adrese bağlı değil.
 *
 * Geliştirmede localhost DOĞRU adrestir; kural yalnızca üretimde işler.
 */
const ABSOLUTE_URLS_UNUSABLE =
  SITE_URL_UNUSABLE;

const trimmed = (value: string | null | undefined): string | null => {
  const s = typeof value === "string" ? value.trim() : "";
  return s.length > 0 ? s : null;
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const icon = site.faviconImage || "/favicon.ico";

  const brand = trimmed(site.brandName) ?? FALLBACK_BRAND;

  /**
   * Panelin `seoTitleTr` / `seoDescriptionTr` alanları bugüne kadar kaydediliyor
   * ama hiçbir yere yansımıyordu; buradan bağlanıyorlar.
   *
   * `seoTitleEn` / `seoDescriptionEn` HÂLÂ BAĞLANAMIYOR ve bu bir eksiklik
   * değil, mevcut mimarinin sonucu: dil seçimi `localStorage`'da tutuluyor,
   * TR ve EN aynı URL'de yaşıyor. Sunucu bir adres için tek bir `<title>` basar;
   * ikisini birden basmak çakışan etiketler üretir. İngilizce metinler URL
   * tabanlı dil göçünde (Faz 8) `app/[locale]` altında karşılığını bulacak.
   */
  const title =
    trimmed(site.seoTitleTr) ??
    (trimmed(site.brandName)
      ? `${trimmed(site.brandName)} — Kiralık Lüks Villalar`
      : `${FALLBACK_BRAND} — Kiralık Lüks Villalar`);

  const description = trimmed(site.seoDescriptionTr) ?? FALLBACK_DESCRIPTION;

  /**
   * Paylaşım görseli: önce panelin `ogImage` alanı, yoksa logo. İkisi de yoksa
   * alan HİÇ basılmaz — uydurma bir yol (`/og.png` gibi) basmak, 404 veren bir
   * görselle boş önizleme demektir; hiç basmamak en azından platformun kendi
   * yedeğine düşmesine izin verir.
   */
  const rawImage = trimmed(site.ogImage) ?? trimmed(site.logoImage);
  const imageIsAbsolute = rawImage !== null && /^https?:\/\//i.test(rawImage);
  const image =
    rawImage && (imageIsAbsolute || !ABSOLUTE_URLS_UNUSABLE) ? rawImage : null;

  const metadata: Metadata = {
    /**
     * `template` alt sayfaların marka ekini otomatik almasını sağlar: bir sayfa
     * yalnızca `title: "Favorilerim"` yazar, çıktı "Favorilerim — <marka>" olur.
     * `default` şablonun ön koşulu ve kök sayfanın kendi başlığıdır (şablon
     * tanımlandığı segmente uygulanmaz, yalnızca ALTINDAKİLERE).
     */
    title: { default: title, template: `%s — ${brand}` },
    description,
    icons: {
      icon: icon,
      shortcut: icon,
      apple: icon,
    },
    /**
     * Varsayılan tarama yönergesi. Alt segmentler kendi `robots` alanını
     * yazarak bunu tamamen değiştirebilir — `/yonetim` ve `/favoriler` zaten
     * `index: false` basıyor.
     *
     * `max-image-preview: large` villa fotoğraflarının arama sonucunda büyük
     * görünmesini sağlar; görsel ağırlıklı bir katalogda tıklama oranını
     * doğrudan etkiler.
     */
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      siteName: brand,
      // Site TR/EN ama ikisi de AYNI adreste yaşıyor (dil `localStorage`'da),
      // bu yüzden alternatif dil ayrı bir URL olarak bildirilemez.
      locale: "tr_TR",
      title,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      // Görsel yoksa "büyük görsel" kartı sözü vermenin anlamı yok.
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };

  if (!ABSOLUTE_URLS_UNUSABLE) {
    /**
     * `metadataBase` OLMADAN göreli her OG/canonical yolu kırıktır (Next göreli
     * yolu mutlaklaştıramaz). Alt sayfaların `alternates.canonical: "/villa/x"`
     * yazabilmesinin tek şartı bu alandır.
     */
    metadata.metadataBase = new URL(SITE_URL);
    metadata.openGraph = { ...metadata.openGraph, url: SITE_URL };
  }

  return metadata;
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // `lang="tr"` SABİT ve şimdilik doğru: site TR/EN ama dil `localStorage`'da
    // tutuluyor, URL'de dil yok. Yani bir adres her zaman aynı (Türkçe)
    // içerikle taranır; `lang` değişkeni yapmak sunucu çıktısını değiştirmez,
    // yalnızca hidrasyon uyuşmazlığı üretir. URL tabanlı dil (ve `hreflang`)
    // Faz 8'e ertelendi (bkz. PLAN.md / docs/denetim-yol-haritasi.md).
    <html lang="tr" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-white text-[#2a1a0e]">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
