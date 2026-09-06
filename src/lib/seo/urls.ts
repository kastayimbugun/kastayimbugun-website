/**
 * Kanonik URL üretiminin TEK kaynağı.
 *
 * Neden ayrı bir dosya: aynı bölge şu an DÖRT ayrı yoldan 200 dönüyor —
 * `/villalar`, `/villalar/[city]`, `/villalar/[city]/[region]` ve
 * `/villalar/[...location]`. Google için bu, aynı villa listesinin dört ayrı
 * sayfası demek (çift içerik: sıralama gücü dört adrese bölünür, hangisinin
 * gösterileceğine Google karar verir). Dört rota da `regionPath()` çıktısını
 * canonical olarak basarsa Google hepsini tek adreste birleştirir. Yol biçimi
 * ileride değişirse YALNIZCA bu dosya değişir.
 *
 * Saf yardımcı: bilerek `server-only` işaretlenmedi ve veri çekmez — hem sunucu
 * bileşenlerinden hem `generateMetadata`'dan hem de istemciden çağrılabilsin
 * (ARCHITECTURE.md §1: veri erişimi `src/lib/data/**` katmanının işi).
 */

/** Villa listesinin kökü. Bölge yolları bunun altına kurulur. */
export const VILLA_LIST_PATH = "/villalar";

/** Villa detayının kökü. */
export const VILLA_DETAIL_PATH = "/villa";

/**
 * Bölge zincirinde izin verilen en fazla basamak. İki işi var: bozuk veride
 * (kendini gösteren `parentId`) sonsuz döngüyü kesmek ve uydurulmuş uzun
 * URL'lerde boşuna arama yapılmasını engellemek.
 *
 * Gerçek veri şu an 7 basamağa kadar çıkıyor
 * (`antalya/kas/kas-merkez/islamlar/uzumlu/patara/kisla`), o yüzden sınır bol
 * tutuldu. DİKKAT: `regions.depth` sütununa güvenilemez — bu satırların hepsi
 * `depth = 3` yazıyor ama gerçek `parent_id` zinciri 7 basamak. Zinciri kuran
 * tek doğru kaynak `parentId`'dir, `depth` değil.
 */
// NOT: `@/lib/regionTree` de `MAX_REGION_CHAIN` adında bir sabit dışa
// aktarıyor ama o BAŞKA bir şey (panelin izin verdiği kademe sayısı = 8).
// Bu buradaki yalnızca sonsuz döngüye karşı bir tavan; karışmasın diye
// farklı adlandırıldı.
const MAX_REGION_CHAIN = 12;

const stripTrailingSlash = (url: string): string => url.replace(/\/+$/, "");

/** package.json → `next dev -p 3007`. */
const LOCAL_SITE_URL = "http://localhost:3007";

/**
 * Mutlak site kökü. Sıra: açık ayar → Vercel üretim adresi → yerel geliştirme.
 *
 * ⚠️ AÇIK RİSK — ALAN ADI HENÜZ BAĞLANMADI.
 * Site Vercel'de yayında ve `.env.example` (dolayısıyla büyük olasılıkla
 * Vercel'deki ortam değişkeni de) `NEXT_PUBLIC_SITE_URL=http://localhost:3007`
 * diyor. Bu değişken ÜRETİMDE localhost'a ayarlı KALIRSA burası localhost
 * döner ve buna bağlı olan her şey bozulur: `metadataBase`, `<link rel=canonical>`,
 * Open Graph görselleri, JSON-LD `url` alanları ve sitemap tamamen
 * `http://localhost:3007` adresini gösterir. Yani canonical'lar Google'ın
 * erişemediği bir adrese işaret eder ve paylaşım önizlemeleri boş çıkar —
 * hata hiçbir yerde patlamaz, sessizce yanlış olur.
 *
 * Alan adı bağlanana kadar en güvenli davranış: Vercel'de bu değişkeni
 * TANIMLAMAMAK. O zaman aşağıdaki ikinci basamak devreye girer ve Vercel'in
 * gerçek üretim adresi kullanılır. `SITE_URL_IS_LOCAL` bu durumu çağıran tarafa
 * bildirir (ör. üretimde OG görselini hiç basmamak için).
 *
 * `process.env.X` üye erişimi olarak YAZILIR, destructure EDİLMEZ: Next yalnızca
 * bu biçimi derleme sırasında gerçek değerle değiştirir. Ayrıca
 * `VERCEL_PROJECT_PRODUCTION_URL` `NEXT_PUBLIC_` önekli olmadığı için TARAYICIDA
 * her zaman `undefined`'dır; istemciden çağrıldığında yalnızca birinci ve
 * üçüncü basamak çalışır.
 *
 * (Aynı sıralama `src/lib/email/send.ts` → `siteUrl()` içinde de var; oradaki
 * sürüm adres bulunamazsa boş string döner çünkü e-posta şablonu bağlantıyı hiç
 * basmamayı tercih eder. Burada boş string dönemez: `metadataBase` mutlak bir
 * URL ister.)
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && explicit.trim()) return stripTrailingSlash(explicit.trim());

  // Vercel bu değişkeni protokolsüz verir: "proje-adi.vercel.app".
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel && vercel.trim()) {
    const host = vercel.trim().replace(/^https?:\/\//i, "");
    return stripTrailingSlash(`https://${host}`);
  }

  return LOCAL_SITE_URL;
}

/** Mutlak site kökü, sondaki `/` temizlenmiş (ör. `https://ornek.com`). */
export const SITE_URL: string = resolveSiteUrl();

/**
 * `SITE_URL` yerel bir adres mi? Üretimde `true` ise ortam değişkeni yanlış
 * demektir (yukarıdaki uyarı). Çağıran taraf buna bakıp canonical/OG basmayı
 * atlayabilir — yanlış mutlak adres basmaktansa hiç basmamak yeğdir.
 */
export const SITE_URL_IS_LOCAL: boolean =
  /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(SITE_URL);

/**
 * Mutlak adres basmak GÜVENSİZ mi?
 *
 * Bu koşul altı ayrı dosyaya kopyalanmıştı (`layout`, `robots`, `sitemap`,
 * villa detayı, `/sayfa`, `/villa-basvurusu`, liste). Altı kopyanın biri
 * değişse diğerleri sessizce ayrışırdı — tam olarak "aynı kuralın birden çok
 * uygulaması" sınıfından bir hata, bu projede bir kez fiyat hesabında yaşandı.
 *
 * Geliştirmede `false`: localhost orada GERÇEKTEN doğru köktür ve alanların
 * basılması onları doğrulanabilir kılar. Yalnızca üretim derlemesinde ve kök
 * hâlâ yerelken `true` olur.
 */
export const SITE_URL_UNUSABLE: boolean =
  SITE_URL_IS_LOCAL && process.env.NODE_ENV === "production";

/**
 * Göreli yolu mutlak URL'e çevirir.
 *
 * Zaten mutlak olan adresler olduğu gibi döner (Supabase Storage görselleri
 * `imageUrl()` sonrası tam URL'dir).
 *
 * Güvenlik: `//baska-site.com` ve `/\baska-site.com` gibi girdiler tarayıcıda
 * BAŞKA bir kökene çözülür. Bu değer canonical/OG/JSON-LD'ye gireceği için
 * baştaki tüm eğik çizgiler tek `/`'e indirilir.
 */
export function absoluteUrl(path: string): string {
  if (typeof path !== "string" || !path.trim()) return SITE_URL;
  const trimmed = path.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const clean = `/${trimmed.replace(/^[\\/]+/, "")}`;
  // "/" tek başına: kök zaten sondaki eğik çizgisiz tutuluyor, ikilemesin.
  return clean === "/" ? SITE_URL : `${SITE_URL}${clean}`;
}

/**
 * `regionPath` / `resolveRegion` için gereken EN DAR bölge şekli.
 *
 * `src/lib/data/villas.ts` içindeki `Region` tipi bilerek import edilmedi: o
 * dosya `server-only` işaretli ve bu yardımcı istemciden de çağrılabilmeli.
 * `Region` bu arayüzü yapısal olarak zaten karşılar, `getRegions()` çıktısı
 * doğrudan geçirilebilir. (Projede aynı desen: `villaUtils.ts` →
 * `PriceRangeInput`, `pricing.ts` → `PricingInput`.)
 */
export interface RegionNode {
  id: string;
  slug: string;
  parentId: string | null;
}

/**
 * Bölgenin kök → yaprak sırasıyla tam zinciri (kendisi dahil).
 *
 * Jenerik: `getRegions()` çıktısı verilirse `Region[]` döner, `name`/`province`
 * gibi alanlar kaybolmaz — ekmek kırıntısı (breadcrumb) üretenler bunlara
 * ihtiyaç duyuyor.
 *
 * Döngü koruması var: `parentId` bozuk veride kendini gösterebilir
 * (`SearchBar.tsx` içindeki benzer döngüde bu koruma yok, tarayıcıyı kilitler).
 */
export function regionAncestors<T extends RegionNode>(
  region: T | null | undefined,
  regions: readonly T[]
): T[] {
  if (!region) return [];

  const byId = new Map<string, T>();
  for (const r of regions) byId.set(r.id, r);

  const chain: T[] = [region];
  const seen = new Set<string>([region.id]);
  let current: T = region;

  while (chain.length < MAX_REGION_CHAIN) {
    const parentId = current.parentId;
    if (!parentId || seen.has(parentId)) break;
    const parent = byId.get(parentId);
    if (!parent) break;
    seen.add(parent.id);
    chain.unshift(parent);
    current = parent;
  }

  return chain;
}

/**
 * Bir bölgenin TEK kanonik yolu: tam üst zincir + kendi slug'ı.
 * Örnek: `/villalar/antalya/kas/cukurbag`.
 *
 * KARAR — neden tam hiyerarşik yol:
 *  · Derinliği sınırsız tek biçim bu. `[city]` bir, `[city]/[region]` iki
 *    basamağı ifade edebiliyor; üç basamaklı bir bölge yalnızca `[...location]`
 *    ile yazılabiliyor. Kanonik biçimin her bölge için üretilebilmesi şart.
 *  · Site zaten bunu üretiyor: `SearchBar.tsx` bölge seçiminde tam zinciri
 *    kurup oraya yönlendiriyor. Yani Google'ın çoğunlukla gördüğü adres bu.
 *  · Derinlik 0 olan bir bölgede sonuç `/villalar/antalya` olur; bu dizge
 *    `[city]` rotasının ürettiğiyle birebir aynıdır, çakışma doğmaz.
 *
 * Bölge yoksa/çözülemezse filtresiz liste kökü (`/villalar`) döner.
 *
 * `regions` her çağrıda haritalanır (O(n)). Bölge sayısı onlarla ölçüldüğü için
 * sorun değil; binlerce bağlantı üretilen bir yerde (sitemap) zincir bir kez
 * hesaplanıp yeniden kullanılmalı.
 */
export function regionPath(
  region: RegionNode | null | undefined,
  regions: readonly RegionNode[]
): string {
  if (!region) return VILLA_LIST_PATH;

  const segments = regionAncestors(region, regions)
    .map((r) => (typeof r.slug === "string" ? r.slug.trim() : ""))
    .filter((s) => s.length > 0)
    .map((s) => encodeURIComponent(s));

  if (segments.length === 0) return VILLA_LIST_PATH;
  return `${VILLA_LIST_PATH}/${segments.join("/")}`;
}

/** Villa detayının kanonik yolu: `/villa/<slug>`. */
export function villaPath(slug: string): string {
  const clean = typeof slug === "string" ? slug.trim() : "";
  if (!clean) return VILLA_DETAIL_PATH;
  return `${VILLA_DETAIL_PATH}/${encodeURIComponent(clean)}`;
}

/**
 * Liste sayfasının kanonik yolu.
 *
 * KARAR — kanonik URL'de NE VAR, NE YOK:
 *
 *  VAR
 *   · Bölge → yol segmenti olarak (`regionPath`). Sayfanın kimliği bu.
 *   · `sayfa` (≥2) → her sayfada BAŞKA villalar var; ikinci sayfa birincinin
 *     kopyası değil, kendine canonical olmalı. `sayfa=1` yazılmaz — `/villalar`
 *     ile `/villalar?sayfa=1` aynı sayfadır, ikisi ayrı adres olmasın.
 *   · `kategori` → YALNIZCA bölgesiz listede. Kategoriler veritabanındaki
 *     sayılı ve elle küratörlü bir küme (adı, görseli, açıklaması olan gerçek
 *     bir koleksiyon), o yüzden `/villalar?kategori=balayi` indekslenmeye değer.
 *     Bölgeyle BİRLİKTE yazılmaz: bölge × kategori çarpımı yüzlerce ince
 *     içerikli sayfa üretir, hepsi birbirinin alt kümesi olur.
 *
 *  YOK (bilerek düşürülür — hepsi filtredir, canonical daima filtresiz sayfayı
 *  gösterir): `q`, `giris`/`cikis` (`in`/`out`), `kisi`/`guests`, `yatak`,
 *  `minFiyat`, `maxFiyat`, `ozellik[]`, `gece`, `etiket`, `firsat`, `oneCikan`,
 *  `sirala`.
 *  Gerekçe: bunların değerleri kullanıcıdan gelir ve bileşimleri sonsuzdur —
 *  tarih × kişi × fiyat × 23 olanak. Her bileşimi kendine canonical yapmak
 *  Google'a sonsuz sayıda neredeyse aynı sayfa göstermek demektir (tarama
 *  bütçesi bu URL'lerde tükenir). `sirala` ayrıca aynı içeriği yalnızca başka
 *  sırayla gösterir.
 *
 * Fonksiyon SADECE kanoniğe girmeye hakkı olan alanları kabul eder; böylece bir
 * filtrenin canonical'a sızması yapısal olarak imkânsızdır. Gezinme
 * bağlantıları (`<Link href>`) bu fonksiyonla üretilmez, onları üreten taraf
 * kendi query'sini kurar.
 */
export interface ListPathParams {
  /**
   * Bölge. Verilirse `regions` de VERİLMELİ — üst zincir ondan kurulur, aksi
   * hâlde derin bir bölge yanlışlıkla tek segmentli (kanonik olmayan) yol üretir.
   */
  region?: RegionNode | null;
  /** `getRegions()` çıktısı. */
  regions?: readonly RegionNode[];
  /** Kategori slug'ı — yalnızca `region` yokken kanoniğe yazılır. */
  kategori?: string | null;
  /** Sayfa numarası; 2 ve üzeri yazılır. */
  sayfa?: number | null;
}

export function listPath(params: ListPathParams = {}): string {
  const base = params.region
    ? regionPath(params.region, params.regions ?? [])
    : VILLA_LIST_PATH;

  const query = new URLSearchParams();

  if (!params.region) {
    const kategori = typeof params.kategori === "string" ? params.kategori.trim() : "";
    if (kategori) query.set("kategori", kategori);
  }

  const sayfa = Number(params.sayfa);
  if (Number.isFinite(sayfa) && sayfa >= 2) {
    query.set("sayfa", String(Math.floor(sayfa)));
  }

  const qs = query.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Bölgenin zincirini küçük harfli slug dizisine indirger (karşılaştırma için). */
function chainSlugs(region: RegionNode, regions: readonly RegionNode[]): string[] {
  return regionAncestors(region, regions).map((r) =>
    typeof r.slug === "string" ? r.slug.trim().toLowerCase() : ""
  );
}

/** `needle`, `haystack`'in sonunda mı? (boş `needle` her zaman evet) */
function endsWith(haystack: readonly string[], needle: readonly string[]): boolean {
  if (needle.length > haystack.length) return false;
  const offset = haystack.length - needle.length;
  return needle.every((s, i) => haystack[offset + i] === s);
}

/** URL'den gelen (GÜVENİLMEZ) segmentleri normalleştirir. */
function normalizeSegments(
  input: readonly string[] | string | null | undefined
): string[] {
  const raw =
    typeof input === "string"
      ? input.split("/")
      : Array.isArray(input)
        ? input
        : [];

  // Aşırı derin yol = geçersiz yol. Erken çıkmak hem işi kısar hem de
  // uydurulmuş uzun URL'lerle boşuna arama yapılmasını engeller.
  if (raw.length > MAX_REGION_CHAIN) return [];

  return raw
    .map((s) => (typeof s === "string" ? s.trim().toLowerCase() : ""))
    .filter((s) => s.length > 0 && s.length <= 120);
}

/**
 * URL segmentlerinden bölgeyi çözer. Çözemezse `null` döner — çağıran taraf
 * `notFound()` çağırmalı.
 *
 * Neden gerekli: bugün `/villalar/asdfgh` 200 dönüyor. Rota bileşeni slug'ı
 * doğrulamadan `VillaListPage`'e geçiyor, `getVillaCardPage` bilinmeyen bölgede
 * boş sonuç dönüyor ve kullanıcı "0 villa" yazan geçerli bir sayfa görüyor.
 * Uydurulan her slug ayrı bir indekslenebilir boş sayfa demek.
 *
 * Segmentler kullanıcıdan gelir, güvenilmez kabul edilir.
 *
 * Çözümleme sırası (yalnızca SON segment bölgeyi belirler, öncekiler zinciri
 * doğrular):
 *  1. Son segment hiçbir bölgenin slug'ı değil → `null`. (404)
 *  2. Tek segment ve o slug'ı birden fazla bölge taşıyor (ör. iki ilin
 *     "merkez"i) → `null`. Hangisi olduğunu bilmenin yolu yok; tahmin edip
 *     yanlış bölgenin villalarını göstermektense 404 doğrudur.
 *  3. URL'deki zincir bölgenin gerçek üst zinciriyle birebir aynı → KANONİK
 *     isabet, bölge döner.
 *  4. Zincir eksik ama gerçek zincirin sonuyla uyuşuyor (ör. `/villalar/kas/cukurbag`
 *     yerine kanonik `/villalar/antalya/kas/cukurbag`) → bölge yine döner.
 *     `Footer.tsx` ve `HomeClient.tsx` bugün tam olarak bu biçimi üretiyor
 *     (`/villalar/{parentSlug}/{slug}`); burada 404 vermek sitenin kendi
 *     bağlantılarını kırardı. Sayfa 200 döner, canonical doğru adresi gösterir,
 *     Google ikisini birleştirir.
 *  5. Zincir gerçek zincirle çelişiyor (ör. `/villalar/zzz/kas`) → `null`.
 *     Uydurulmuş üst segmentin ayrı bir sayfa olarak yaşamasına izin verilmez.
 *
 * Gelen yolun kanonik olup olmadığını anlamak için ayrı bir fonksiyon yok,
 * gerek de yok — çağıran taraf karşılaştırır:
 *   `regionPath(region, regions) === "/villalar/" + segments.join("/")`
 * Eşit değilse istenirse kalıcı yönlendirme (308) verilebilir.
 */
export function resolveRegion<T extends RegionNode>(
  slugSegments: readonly string[] | string | null | undefined,
  regions: readonly T[]
): T | null {
  const segments = normalizeSegments(slugSegments);
  if (segments.length === 0) return null;
  if (!Array.isArray(regions) || regions.length === 0) return null;

  const leaf = segments[segments.length - 1];
  const candidates = regions.filter(
    (r) => typeof r?.slug === "string" && r.slug.trim().toLowerCase() === leaf
  );
  if (candidates.length === 0) return null;

  const parents = segments.slice(0, -1);

  if (parents.length === 0) {
    return candidates.length === 1 ? candidates[0] : null;
  }

  const exact = candidates.find((c) => {
    const chain = chainSlugs(c, regions);
    return chain.length === segments.length && endsWith(chain, segments);
  });
  if (exact) return exact;

  const partial = candidates.find((c) =>
    endsWith(chainSlugs(c, regions).slice(0, -1), parents)
  );
  return partial ?? null;
}
