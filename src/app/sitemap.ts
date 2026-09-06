import type { MetadataRoute } from "next";
import { getRegions, getRegionVillaCounts } from "@/lib/data/villas";
import {
  getSitemapCategorySlugs,
  getSitemapPages,
  getSitemapVillas,
} from "@/lib/data/sitemap";
import {
  SITE_URL_UNUSABLE,
  VILLA_LIST_PATH,
  absoluteUrl,
  listPath,
  regionPath,
  villaPath,
} from "@/lib/seo/urls";

/**
 * `/sitemap.xml`
 *
 * Adres üretimi tamamen `src/lib/seo/urls.ts`'e bırakılır (`villaPath`,
 * `regionPath`, `listPath`, `absoluteUrl`). Burada ikinci bir URL mantığı YOK:
 * sitemap ile sayfaların canonical'ı aynı fonksiyondan çıkmazsa Google iki
 * farklı adres görür ve sitemap kendi canonical'ını çürütür.
 *
 * ── SAYFALAMA KARARI ──────────────────────────────────────────────────────
 * `generateSitemaps()` DEĞİL, `.range()` döngüsü (`src/lib/data/sitemap.ts`).
 * Gerekçe: `generateSitemaps()` çıktıyı BÖLER (`/sitemap/0.xml`, `/sitemap/1.xml`)
 * ve tek dosyanın 50.000 URL / 50 MB sınırını aşmamak için vardır. Bizim
 * sorunumuz bu değil — 2.000 villada bile ~2.100 URL, tek dosya fazlasıyla
 * yeter. Bizim sorunumuz PostgREST'in 1.000 satırda SESSİZCE kırpması; onu
 * çözen şey sorgunun sayfalanması, çıktının bölünmesi değil. Dosya bölmek
 * kırpma sorununu çözmez, üstelik Search Console'a sitemap index eklemeyi
 * gerektirir. Katalog 50.000'e yaklaşırsa karar yeniden ele alınır.
 *
 * ── `lastModified` ────────────────────────────────────────────────────────
 * Yalnızca gerçek `updated_at` varsa basılır. `new Date()` basmak Google'a her
 * gün "sitedeki her şey değişti" demek olurdu; birkaç turda sitemap tarihine
 * güven kalmaz. `regions` ve `categories` tablolarında `updated_at` YOK
 * (0001_init.sql), o yüzden o girdilerde alan hiç yazılmaz.
 *
 * ── `changeFrequency` ─────────────────────────────────────────────────────
 * Bilerek hiç basılmıyor: değeri tahmin olurdu ve Google bu alanı zaten yok
 * sayıyor. `priority` kalıyor — o site İÇİNDEKİ göreli önemi anlatır, uydurma
 * değil.
 */

/** Villa/sayfa verisi değişince sitemap en geç 1 saatte tazelenir. */
export const revalidate = 3600;

/**
 * ÜRETİMDE `SITE_URL` localhost ise sitemap BOŞ döner.
 *
 * `NEXT_PUBLIC_SITE_URL` üretimde `http://localhost:3007` kalırsa (bkz.
 * `urls.ts` içindeki açık risk notu) buradaki her `<loc>` localhost'u gösterir.
 * Sitemap protokolü bunu ayrıca reddeder: dosyadaki adresler dosyanın kendi
 * host'uyla aynı olmalı, yoksa Google TÜM dosyayı atar. Yani yanlış adres
 * basmanın kazancı sıfır, maliyeti Search Console'da kalıcı hata. Boş bir
 * `<urlset>` ise geçerli XML'dir ve sorun ortam değişkeni düzeltilince
 * kendiliğinden geçer.
 *
 * Geliştirmede localhost DOĞRU adrestir; kural yalnızca üretimde işler.
 */
const ABSOLUTE_URLS_UNUSABLE =
  SITE_URL_UNUSABLE;

type SitemapEntry = MetadataRoute.Sitemap[number];

/** Girdi kurar. `lastModified` yoksa alan HİÇ eklenmez (uydurma tarih yok). */
function entry(
  path: string,
  priority: number,
  lastModified?: string | null
): SitemapEntry {
  const item: SitemapEntry = { url: absoluteUrl(path), priority };
  if (lastModified) item.lastModified = lastModified;
  return item;
}

/**
 * Herkese açık, veriye bağlı olmayan sayfalar.
 *
 * Listede OLMAYANLAR ve nedenleri — üçü de `noindex` basıyor, `noindex` bir
 * sayfa sitemap'e girerse Google'a çelişkili iki sinyal verilmiş olur
 * ("indeksle" + "indeksleme"):
 *  · `/favoriler` — kişiye özel, tarayıcıda saklanıyor.
 *  · `/rezervasyon-talebi/tesekkurler`, `/villa-basvurusu/tesekkurler` —
 *    form sonrası sonuç ekranı.
 *  · `/yonetim/**` — panel (ayrıca robots.txt ile taramaya kapalı).
 */
const STATIC_PATHS: ReadonlyArray<{ path: string; priority: number }> = [
  { path: "/", priority: 1 },
  { path: VILLA_LIST_PATH, priority: 0.9 },
  { path: "/villa-basvurusu", priority: 0.4 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (ABSOLUTE_URLS_UNUSABLE) return [];

  const [villas, regions, regionCounts, categorySlugs, pages] = await Promise.all([
    getSitemapVillas(),
    getRegions(),
    getRegionVillaCounts(),
    getSitemapCategorySlugs(),
    getSitemapPages(),
  ]);

  const items: MetadataRoute.Sitemap = STATIC_PATHS.map((s) =>
    entry(s.path, s.priority)
  );

  // Villa detayları — katalogun ana gövdesi.
  for (const villa of villas) {
    items.push(entry(villaPath(villa.slug), 0.8, villa.updatedAt));
  }

  /**
   * Bölge yolları.
   *
   * `regionPath()` her çağrıda bölge haritasını yeniden kurar (O(n)); zincir
   * bölge başına BİR KEZ hesaplanıp haritada tutulur. Bugün 25 bölge var ama
   * `urls.ts` bunu açıkça uyarıyor ve bölge sayısı villa göçüyle artacak.
   *
   * `regions.depth` sütununa DOKUNULMUYOR: 25 bölgenin 7'sinde yanlış (hepsi
   * `3` yazıyor, gerçek zincir 4-6 basamak). Hiyerarşinin tek doğru kaynağı
   * `parentId` ve `regionPath()` zaten onu kullanıyor.
   */
  const pathByRegionId = new Map<string, string>();
  for (const region of regions) {
    pathByRegionId.set(region.id, regionPath(region, regions));
  }

  // Villası olmayan bölge = "0 sonuç" sayfası; tarama bütçesini ince içerikte
  // harcamayalım. Sayım okunamazsa (boş harita) eleme yapılmaz — sitemap'i
  // sessizce boşaltmaktansa fazla URL basmak yeğdir.
  const filterEmptyRegions = regionCounts.size > 0;
  for (const region of regions) {
    if (filterEmptyRegions && (regionCounts.get(region.slug) ?? 0) === 0) continue;
    const path = pathByRegionId.get(region.id);
    // Slug'ı boş olan bozuk kayıtta `regionPath()` liste köküne düşer; onu
    // ikinci kez basmayalım.
    if (!path || path === VILLA_LIST_PATH) continue;
    items.push(entry(path, 0.7));
  }

  // Kategoriler: `/villalar?kategori=<slug>`. Bu biçim `listPath()`'in kanonik
  // kararı — kategori bölgesiz listede kanoniğe girer (bkz. urls.ts).
  for (const slug of categorySlugs) {
    items.push(entry(listPath({ kategori: slug }), 0.6));
  }

  // Dinamik (hukuki/kurumsal) sayfalar.
  for (const page of pages) {
    items.push(entry(`/sayfa/${encodeURIComponent(page.slug)}`, 0.3, page.updatedAt));
  }

  return items;
}
