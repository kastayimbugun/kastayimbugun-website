import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import VillaListClient from "@/components/VillaListClient";
import {
  getRegions,
  getVillaCardPage,
  getVillaPriceCeiling,
  type Region,
  type VillaListQuery,
  type VillaSort,
} from "@/lib/data/villas";
import { getCategories } from "@/lib/data/categories";
import {
  SITE_URL_UNUSABLE,
  absoluteUrl,
  listPath,
  resolveRegion,
} from "@/lib/seo/urls";
import type { AmenityKey } from "@/lib/types";

/**
 * Villa listesinin SUNUCU tarafı — dört rota (`/villalar`, `/villalar/[city]`,
 * `/villalar/[city]/[region]`, `/villalar/[...location]`) bunu paylaşır.
 *
 * Filtreleme, sıralama ve sayfalama burada (SQL'de) yapılır; istemci bileşeni
 * yalnızca filtre arayüzünü ve hazır 24 kartı alır. Önceki hâlde tüm katalog
 * istemciye gönderiliyor ve filtreleme her tuş vuruşunda tarayıcıda çalışıyordu.
 *
 * ── SEO: dört rota, TEK sayfa ──────────────────────────────────────────────
 * Aynı bölgeye dört ayrı yoldan girilebiliyor. Google için bu dört ayrı sayfa
 * demekti (çift içerik). Çözüm iki parçalı ve ikisi de bu dosyada:
 *  1. `resolveList()` — gelen segmentleri DOĞRULAR. Çözülemeyen yol 404 olur,
 *     böylece uydurulmuş slug'lar indekslenebilir boş sayfaya dönüşmez.
 *  2. `buildListMetadata()` — dört rotanın da bastığı canonical'ı üretir.
 *     Hangi yoldan gelinirse gelinsin `listPath()` aynı adresi döndürür, Google
 *     dört adresi tek sayfada birleştirir.
 * Rotalar `generateMetadata`'yı kendileri EXPORT etmek zorunda (Next bunu
 * bileşenden devralmaz), ama mantığı tekrarlamazlar: her biri tek satırla
 * `buildListMetadata()`'yı çağırır.
 *
 * ── KARAR: kanonik olmayan yolda 308 YOK, yalnızca canonical etiketi ────────
 * `/villalar/kas/kalkan` geçerli ama kanonik değil (kanoniği
 * `/villalar/antalya/kas/kalkan`). Böyle bir yol 308 ile kanoniğe
 * YÖNLENDİRİLMİYOR; 200 dönüyor ve canonical doğru adresi gösteriyor. Gerekçe:
 *
 *  1. Sitenin KENDİ bağlantıları bu kısa biçimi üretiyor: `Footer.tsx` ve
 *     `HomeClient.tsx` `/villalar/{parentSlug}/{slug}` yazıyor. 308 kurmak, ana
 *     sayfadaki bölge kartlarının ve footer'ın TAMAMINI yönlendirme zincirine
 *     sokardı — her gezinme fazladan bir gidiş-dönüş.
 *  2. Filtre arayüzü query'yi BULUNULAN yola ekliyor. Kanonik olmayan bir yolda
 *     her filtre değişikliği yeni bir yönlendirme tetiklerdi; kullanıcı her
 *     tıklamada iki istek beklerdi.
 *  3. Asıl zarar olan "sonsuz çöp URL" 308 ile değil `notFound()` ile
 *     kapanıyor. Geriye kalan çift içerik SONLU ve küçük bir küme: yalnızca
 *     sitenin kendi ürettiği kısa biçimler. Google bunları `rel=canonical` ile
 *     zaten birleştirir — canonical, birleştirme için resmen yeterli bir sinyal.
 *
 * Yani 308 buradaki sorunu çözmüyor, karşılığında sitenin ana gezinmesini
 * yavaşlatıyordu. KALICI çözüm yönlendirme değil, kaynağı düzeltmek:
 * `Footer.tsx` ve `HomeClient.tsx` bağlantıları `regionPath()` ile üretsin
 * (o dosyalar bu ajanın kapsamı dışında, raporlandı). O yapıldığında kısa biçim
 * yalnızca eski dış bağlantılarda kalır ve 308 tartışması — istenirse — sayfa
 * bileşeninde değil `proxy.ts` içinde ele alınmalıdır; yönlendirme kararı
 * render'dan önce verilmelidir.
 */

const SORTS = new Set<VillaSort>(["featured", "priceAsc", "priceDesc", "rating"]);

type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const num = (v: string | string[] | undefined): number | undefined => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** URL parametrelerini güvenli bir sorguya çevirir (ARCHITECTURE.md §3). */
export function parseVillaQuery(raw: RawParams): VillaListQuery {
  const ozellikRaw = raw.ozellik;
  const ozellik = (
    Array.isArray(ozellikRaw) ? ozellikRaw : ozellikRaw ? [ozellikRaw] : []
  ).slice(0, 12) as AmenityKey[];

  const siralaRaw = one(raw.sirala) as VillaSort | undefined;

  // Tarih: `giris`/`cikis` kanonik; `in`/`out` SearchBar'ın ürettiği eski adlar.
  const iso = (v: string | string[] | undefined) => {
    const s = one(v);
    return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
  };
  const giris = iso(raw.giris) ?? iso(raw.in);
  const cikis = iso(raw.cikis) ?? iso(raw.out);

  return {
    bolge: one(raw.bolge),
    // Çıkış girişten sonra değilse ikisini de yok say (yarı-açık aralık).
    giris: giris && cikis && cikis > giris ? giris : undefined,
    cikis: giris && cikis && cikis > giris ? cikis : undefined,
    // Kategori bağlantıları hâlâ `?category=` üretiyor; ikisini de kabul et.
    kategori: one(raw.kategori) ?? one(raw.category),
    q: one(raw.q)?.slice(0, 80),
    kisi: num(raw.kisi) ?? num(raw.guests),
    yatak: num(raw.yatak),
    firsat: raw.firsat === "1" || undefined,
    oneCikan: raw.oneCikan === "1" || undefined,
    gece: num(raw.gece),
    etiket:
      raw.etiket === "earlyBooking" ||
      raw.etiket === "lastMinute" ||
      raw.etiket === "shortStay"
        ? raw.etiket
        : undefined,
    minFiyat: num(raw.minFiyat),
    maxFiyat: num(raw.maxFiyat),
    ozellik: ozellik.length ? ozellik : undefined,
    sirala: siralaRaw && SORTS.has(siralaRaw) ? siralaRaw : undefined,
    sayfa: num(raw.sayfa),
  };
}

/**
 * `getRegions()`'ı istek başına TEK sorguya indirir.
 *
 * Bir liste isteğinde bölge listesi iki kez lazım: önce `generateMetadata`
 * (başlık + canonical), sonra sayfa gövdesi. React `cache()` aynı istek
 * içindeki ikinci çağrıyı ilkinin sonucuyla karşılar — yoksa her istek iki kez
 * `regions` sorgular. `getCategories`/`getSiteSettings` veri katmanında zaten
 * sarmalı; `getRegions` değil, sarmalama bu yüzden burada.
 */
const listRegions = cache(getRegions);

/** `resolveList()` çıktısı — metadata ile gövdenin ortak girdisi. */
interface ResolvedList {
  regions: Region[];
  /** Kanonik yolu belirleyen bölge. Kök listede (ve çözülemeyince) `null`. */
  region: Region | null;
  query: VillaListQuery;
  /** Yolda bölge segmenti vardı ama hiçbir bölgeye çözülmedi → 404. */
  missing: boolean;
}

/**
 * URL'i (segmentler + query) tek bir çözümlenmiş duruma indirger.
 *
 * `generateMetadata` ile sayfa gövdesi AYNI kararı vermek zorunda: başlıkta
 * yazan bölge, canonical'daki bölge ve listelenen villalar aynı olmalı. İkisi
 * de burayı çağırır, karar tek yerde verilir.
 */
async function resolveList(
  locationSegments: readonly string[] | undefined,
  searchParams: Promise<RawParams>
): Promise<ResolvedList> {
  const raw = await searchParams;
  const query = parseVillaQuery(raw);
  const regions = await listRegions();

  const segments = (locationSegments ?? []).filter(
    (s): s is string => typeof s === "string" && s.trim().length > 0
  );

  if (segments.length > 0) {
    // Segmentler URL'den, yani KULLANICIDAN geliyor — doğrulanmadan sorguya
    // sokulmaz. `resolveRegion` hem yaprağı bulur hem üst zinciri denetler:
    // `/villalar/asdfgh` (yok) ve `/villalar/zzzz/kalkan` (uydurma üst segment)
    // bu yüzden `null` döner ve çağıran taraf 404 verir. Eskiden ikisi de 200
    // dönüp "0 villa" yazan geçerli bir sayfa gösteriyordu.
    const region = resolveRegion(segments, regions);
    if (!region) return { regions, region: null, query, missing: true };

    // Sorguya rotanın ham metni değil ÇÖZÜLMÜŞ bölgenin slug'ı yazılır.
    query.bolge = region.slug;
    return { regions, region, query, missing: false };
  }

  // Segment yok → `/villalar`. `?bolge=` üreten bir bağlantı sitede kalmadı ama
  // eski/dış bağlantılar için destek sürüyor. Burada 404 VERİLMEZ: bu bir query
  // parametresi, uydurulmuş bir yol değil — sonsuz sayıda indekslenebilir adres
  // üretmez ve canonical zaten bölgenin kanonik yolunu (ya da `/villalar`'ı)
  // gösterip Google'a hangisinin asıl sayfa olduğunu söyler.
  const region = query.bolge
    ? (resolveRegion([query.bolge], regions) ??
      // `getVillaCardPage` slug'ın yanında bölge ADINI da kabul ediyor;
      // etiket ile liste aynı bölgeyi göstersin diye o yol da korunuyor.
      regions.find((r) => r.name === query.bolge) ??
      null)
    : null;

  return { regions, region, query, missing: false };
}

/**
 * Kanonik yolu mutlak adrese çevirir — ya da hiç basmaz.
 *
 * `NEXT_PUBLIC_SITE_URL` üretimde localhost'a ayarlı KALIRSA canonical
 * Google'ın erişemediği bir adresi gösterir; bu, sayfayı indeksten düşürür.
 * Etiketi hiç basmamak ise yalnızca birleştirmeyi kaybettirir (Google sayfayı
 * kendi adresine kanonikler) — yani yanlış adres basmaktan daha az zararlı.
 * Bkz. `src/lib/seo/urls.ts` içindeki AÇIK RİSK notu.
 *
 * Geliştirmede localhost sitenin GERÇEK adresidir, o yüzden basılır; canonical
 * davranışı yerelde de doğrulanabilsin diye.
 */
function canonicalUrl(path: string): string | undefined {
  if (SITE_URL_UNUSABLE) return undefined;
  return absoluteUrl(path);
}

/**
 * Başlık/açıklama metinleri neden burada, `i18n.tsx` sözlüğünde değil:
 * `i18n.tsx` bir `"use client"` context'idir, `generateMetadata` sunucuda
 * çalışır ve onu çağıramaz. E-posta şablonlarında olduğu gibi
 * (ARCHITECTURE.md §7 istisnası) metin kendi dosyasında tutulur. Site tek dilli
 * sunuluyor (`<html lang="tr">`, kök düzen de Türkçe metadata basıyor), o yüzden
 * burada yalnızca TR karşılık var.
 */
const TITLE_SUFFIX = "Kiralık Villalar";

export interface ListMetadataInput {
  /** Rota segmentleri (ör. `["antalya", "kas"]`). Kök listede verilmez. */
  locationSegments?: readonly string[];
  searchParams: Promise<RawParams>;
}

/**
 * Dört liste rotasının da bastığı metadata.
 *
 * KARAR — canonical DAİMA `listPath()` çıktısıdır:
 * `listPath` yapısal olarak yalnızca bölge, kategori ve sayfa numarası kabul
 * eder; `q`, tarih, kişi, fiyat, olanak, sıralama gibi filtreler ona
 * geçirilemez. Yani hangi filtre bileşimiyle gelinirse gelinsin canonical
 * filtresiz kanonik sayfayı gösterir ve sonsuz sayıda "neredeyse aynı" adres
 * indekslenmez.
 */
export async function buildListMetadata({
  locationSegments,
  searchParams,
}: ListMetadataInput): Promise<Metadata> {
  const { regions, region, query, missing } = await resolveList(
    locationSegments,
    searchParams
  );

  if (missing) {
    // Gövde `notFound()` çağıracak. Burada canonical BASILMAZ: var olmayan bir
    // bölgeye kanonik adres vermek onu "asıl sayfa" ilan etmek olurdu.
    // (Aynı desen: `src/app/(site)/sayfa/[slug]/page.tsx`.)
    return { title: "Bölge bulunamadı", robots: { index: false, follow: false } };
  }

  const categories = await getCategories();

  // Kategori yalnızca BÖLGESİZ listede kanoniğe girer (bkz. `listPath`); bölge
  // varken başlığa da yazılmaz ki başlık canonical'ın gösterdiği sayfayı anlatsın.
  const category =
    !region && query.kategori
      ? categories.find((c) => c.slug === query.kategori)
      : undefined;

  const sayfa = query.sayfa && query.sayfa >= 2 ? Math.floor(query.sayfa) : undefined;

  const path = listPath({
    region,
    regions,
    kategori: category?.slug,
    sayfa,
  });

  // Bölge adı slug değil: "kas" değil "Kaş". Sayfadaki <h1> ile aynı kaynak.
  // Kategori adı olduğu gibi geçer: panelden gelen adlar zaten "Balayı Villası",
  // "Lüks Villa" gibi tamamlanmış tamlamalar — sonuna "Kiralık Villalar"
  // eklemek "Balayı Villası Kiralık Villalar" gibi bozuk bir başlık üretiyordu.
  const subject = region
    ? `${region.name} ${TITLE_SUFFIX}`
    : (category?.titleTr.trim() || TITLE_SUFFIX);

  // Sayfa 2+ kendine kanonikleniyor; başlığı da ayrışmalı, yoksa Search Console
  // "yinelenen başlık" der ve iki sayfa birbirinin kopyası sanılır.
  //
  // Marka adı BURAYA yazılmaz: kök düzen (`app/layout.tsx`) bir
  // `title.template` (`"%s — <marka>"`) tanımlıyor ve eki kendisi ekliyor.
  // Burada da eklemek markayı iki kez basardı.
  const title = `${subject}${sayfa ? ` — Sayfa ${sayfa}` : ""}`;

  const description = region
    ? `${region.name}${region.province && region.province !== region.name ? ` (${region.province})` : ""} bölgesinde özel havuzlu, deniz manzaralı kiralık villalar. Kapasite, fiyat ve olanaklara göre filtreleyin, uygun tarihleri görün.`
    : (category?.descTr?.trim() ??
      "Türkiye'nin dört bir yanında özel havuzlu, deniz manzaralı seçkin kiralık villalar. Bölge, kapasite ve fiyata göre filtreleyin, uygun tarihleri görün.");

  const url = canonicalUrl(path);

  return {
    title,
    description,
    // Adres yerel olduğu için basılamıyorsa `alternates` hiç yazılmaz —
    // `canonical: undefined` yerine alanı düşürmek daha temiz.
    ...(url ? { alternates: { canonical: url } } : {}),
    // `openGraph` BİLEREK yazılmıyor. Next metadata'yı SIĞ birleştirir: alt
    // segment kendi `openGraph`'ını yazarsa üstünkini tamamen değiştirir. Kök
    // düzen orada `og:image`, `og:locale` ve `siteName`'i panelden hesaplayarak
    // basıyor (`app/layout.tsx`); buradan kısmi bir blok yazmak o görseli ve
    // dili sessizce düşürürdü. Bölgeye özgü `og:title`/`og:url` istenirse doğru
    // yer orası — kök düzenin görsel mantığı burada tekrarlanmamalı.
  };
}

export default async function VillaListPage({
  searchParams,
  locationSegments,
}: {
  searchParams: Promise<RawParams>;
  /**
   * Rota segmentlerinin TAMAMI (ör. `["antalya", "kas"]`), yalnızca son segment
   * değil. Üst segmentler de doğrulanmalı: eskiden `[city]/[region]` yalnızca
   * `region`'ı geçiriyordu, bu yüzden `/villalar/zzzz/kalkan` 200 dönüyordu.
   */
  locationSegments?: readonly string[];
}) {
  const { regions, region, query, missing } = await resolveList(
    locationSegments,
    searchParams
  );

  // Çözülemeyen bölge = var olmayan sayfa. Boş liste ile 200 dönmek, uydurulan
  // her slug'ı indekslenebilir bir sayfaya çevirirdi.
  if (missing) notFound();

  const [categories, priceCeiling] = await Promise.all([
    getCategories(),
    getVillaPriceCeiling(),
  ]);

  // Kategori filtresi villa slug listesi üzerinden çalışıyor (villa_categories
  // bağını burada ikinci kez sorgulamamak için `getCategories` sonucundan alınır).
  const category = query.kategori
    ? categories.find((c) => c.slug === query.kategori)
    : undefined;

  const pageData = await getVillaCardPage(
    query,
    regions,
    query.kategori ? (category?.villaSlugs ?? []) : undefined
  );

  return (
    <VillaListClient
      items={pageData.items}
      total={pageData.total}
      page={pageData.page}
      pageCount={pageData.pageCount}
      query={query}
      priceCeiling={priceCeiling}
      // <h1> bunu basıyor; slug değil bölge ADI geçiyor ve artık doğrulanmış
      // bölgeden geliyor (eskiden slug'ı ilk eşleşen bölgeyle bulan bir
      // `find()` vardı, iki ilin aynı adlı bölgesinde yanlış adı basabilirdi).
      regionLabel={region?.name}
      regions={regions}
    />
  );
}
