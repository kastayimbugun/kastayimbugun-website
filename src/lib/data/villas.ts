import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images/url";
import type { Villa, AmenityKey, PoolType } from "@/lib/types";

/**
 * Villa veri erişim katmanı. Sayfalar doğrudan Supabase'e değil buraya konuşur.
 * Dönen nesneler arayüzün beklediği Villa şeklindedir, bileşenler değişmez.
 */

const VILLA_FIELDS_BASE = `
  slug, name, code, capacity, bedrooms, bathrooms, pool, size_m2, distance_to_sea,
  distance_airport_km, distance_market_km, distance_restaurant_km,
  distance_transit_km, distance_center_km,
  rating, review_count, featured, discount_percent, deal_tag,
  check_in, check_out, min_nights, base_price, cleaning_fee, service_rate,
  weekend_premium_percent, los_weekly_discount_percent, los_monthly_discount_percent,
  last_minute_discount_percent, last_minute_days, extra_guest_fee, extra_guest_after,
  description_tr, description_en, video_url, amenities,
  regions ( name, province ),
  villa_images ( storage_path, sort_order ),
  villa_seasons ( label_tr, label_en, starts_on, ends_on, price ),
  villa_blocks ( starts_on, ends_on )
`;

// 0019 kolonları (havuz ölçüleri + hasar depozitosu). Migration henüz
// uygulanmadıysa bu alanlar olmadan sorgu tekrar denenir (bkz. selectVillas).
const VILLA_EXTRA_FIELDS = `pool_width, pool_length, pool_depth, damage_deposit, ministry_cert_no`;
const VILLA_FIELDS = `${VILLA_FIELDS_BASE}, ${VILLA_EXTRA_FIELDS}`;

/** 0019 kolonları eksikse (migration uygulanmamış) sadece bu sütunlar hataya yol açar. */
const isMissingExtraColumns = (message: string | undefined) =>
  /pool_width|pool_length|pool_depth|damage_deposit|ministry_cert_no/.test(
    message ?? ""
  );

interface VillaRow {
  slug: string;
  name: string;
  code: string | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  pool: PoolType;
  pool_width: number | null;
  pool_length: number | null;
  pool_depth: number | null;
  size_m2: number | null;
  distance_to_sea: number | null;
  distance_airport_km: number | null;
  distance_market_km: number | null;
  distance_restaurant_km: number | null;
  distance_transit_km: number | null;
  distance_center_km: number | null;
  rating: number | null;
  review_count: number | null;
  featured: boolean;
  discount_percent: number | null;
  deal_tag: Villa["dealTag"] | null;
  check_in: string;
  check_out: string;
  min_nights: number;
  base_price: number;
  cleaning_fee: number | null;
  damage_deposit: number | null;
  ministry_cert_no: string | null;
  service_rate: number | null;
  weekend_premium_percent: number | null;
  los_weekly_discount_percent: number | null;
  los_monthly_discount_percent: number | null;
  last_minute_discount_percent: number | null;
  last_minute_days: number | null;
  extra_guest_fee: number | null;
  extra_guest_after: number | null;
  description_tr: string | null;
  description_en: string | null;
  video_url: string | null;
  amenities: AmenityKey[] | null;
  regions: { name: string; province: string } | null;
  villa_images: { storage_path: string; sort_order: number }[];
  villa_seasons: {
    label_tr: string;
    label_en: string;
    starts_on: string;
    ends_on: string;
    price: number;
  }[];
  villa_blocks: { starts_on: string; ends_on: string }[];
}

/** "16:00:00" → "16:00" */
const hhmm = (t: string) => t.slice(0, 5);

function mapVilla(row: VillaRow): Villa {
  return {
    slug: row.slug,
    name: row.name,
    code: row.code ?? undefined,
    region: row.regions?.name ?? "",
    province: row.regions?.province ?? "",
    images: [...row.villa_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => imageUrl(i.storage_path)),
    videoUrl: row.video_url ?? undefined,
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    pool: row.pool,
    poolWidth: row.pool_width ?? null,
    poolLength: row.pool_length ?? null,
    poolDepth: row.pool_depth ?? null,
    size: row.size_m2 ?? 0,
    distanceToSea: row.distance_to_sea ?? 0,
    distanceAirportKm: row.distance_airport_km,
    distanceMarketKm: row.distance_market_km,
    distanceRestaurantKm: row.distance_restaurant_km,
    distanceTransitKm: row.distance_transit_km,
    distanceCenterKm: row.distance_center_km,
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    featured: row.featured,
    discountPercent: row.discount_percent ?? undefined,
    dealTag: row.deal_tag ?? undefined,
    amenities: row.amenities ?? [],
    descriptionTr: row.description_tr ?? "",
    descriptionEn: row.description_en ?? "",
    checkIn: hhmm(row.check_in),
    checkOut: hhmm(row.check_out),
    minNights: row.min_nights,
    pricePerNight: Number(row.base_price),
    cleaningFee: row.cleaning_fee ?? undefined,
    damageDeposit: row.damage_deposit ?? null,
    ministryCertNo: row.ministry_cert_no ?? null,
    serviceRate: row.service_rate ?? undefined,
    weekendPremiumPercent: row.weekend_premium_percent,
    losWeeklyDiscountPercent: row.los_weekly_discount_percent,
    losMonthlyDiscountPercent: row.los_monthly_discount_percent,
    lastMinuteDiscountPercent: row.last_minute_discount_percent,
    lastMinuteDays: row.last_minute_days,
    extraGuestFee: row.extra_guest_fee != null ? Number(row.extra_guest_fee) : null,
    extraGuestAfter: row.extra_guest_after,
    bookedRanges: row.villa_blocks.map((b) => ({
      start: b.starts_on,
      end: b.ends_on,
    })),
    seasons: [...row.villa_seasons]
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
      .map((s) => ({
        labelTr: s.label_tr,
        labelEn: s.label_en,
        start: s.starts_on,
        end: s.ends_on,
        price: Number(s.price),
      })),
  };
}

export async function getVillas(): Promise<Villa[]> {
  const run = (fields: string) =>
    supabaseServer()
      .from("villas")
      .select(fields)
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("name");

  let res = await run(VILLA_FIELDS);
  // 0019 kolonları henüz yoksa bu alanlar olmadan tekrar dene.
  if (res.error && isMissingExtraColumns(res.error.message)) {
    res = await run(VILLA_FIELDS_BASE);
  }

  if (res.error) throw new Error(`Villalar okunamadı: ${res.error.message}`);
  return (res.data as unknown as VillaRow[]).map(mapVilla);
}

export async function getVilla(slug: string): Promise<Villa | null> {
  const run = (fields: string) =>
    supabaseServer()
      .from("villas")
      .select(fields)
      .eq("status", "published")
      .eq("slug", slug)
      .maybeSingle();

  let res = await run(VILLA_FIELDS);
  if (res.error && isMissingExtraColumns(res.error.message)) {
    res = await run(VILLA_FIELDS_BASE);
  }

  if (res.error) throw new Error(`Villa okunamadı (${slug}): ${res.error.message}`);
  return res.data ? mapVilla(res.data as unknown as VillaRow) : null;
}

export async function getVillaSlugs(): Promise<string[]> {
  const { data, error } = await supabaseServer()
    .from("villas")
    .select("slug")
    .eq("status", "published");

  if (error) throw new Error(`Villa slug'ları okunamadı: ${error.message}`);
  return data.map((v) => v.slug);
}

/**
 * Villa detayındaki "Benzer Villalar" — SQL'de 3'e daraltılır.
 *
 * Eskiden detay sayfası `getVillas()` ile 600 villanın tamamını çekiyor ve
 * hepsini istemci bileşenine prop'luyordu; kullanılan **3 taneydi**. Ölçülen
 * maliyet villa başına 14,3 KB → sayfa başına ~8,4 MB ve build'de 600 sayfa ×
 * aynı yük (~4,9 GB). Bu fonksiyon o yükü ~120 KB'ye indirir.
 *
 * Önce aynı bölgedekiler, yetmezse diğerleri — istemcideki eski sıralamanın aynısı.
 */
export async function getSimilarVillas(
  slug: string,
  regionName: string,
  limit = 3
): Promise<Villa[]> {
  const run = (fields: string, sameRegion: boolean, take: number) => {
    let q = supabaseServer()
      .from("villas")
      .select(fields)
      .eq("status", "published")
      .neq("slug", slug);
    q = sameRegion
      ? q.eq("regions.name", regionName)
      : q.not("regions.name", "eq", regionName);
    return q.order("featured", { ascending: false }).order("name").limit(take);
  };

  const collect = async (sameRegion: boolean, take: number) => {
    let res = await run(VILLA_FIELDS, sameRegion, take);
    if (res.error && isMissingExtraColumns(res.error.message)) {
      res = await run(VILLA_FIELDS_BASE, sameRegion, take);
    }
    if (res.error) return [];
    return (res.data as unknown as VillaRow[]).map(mapVilla);
  };

  const same = await collect(true, limit);
  if (same.length >= limit) return same.slice(0, limit);

  const others = await collect(false, limit - same.length);
  return [...same, ...others].slice(0, limit);
}

/**
 * Verilen slug'lara göre villa çeker (sıra korunur).
 *
 * "Benzer Villalar" kategori modunda kullanılır: eskiden tüm katalog çekilip
 * `Map`'e alınıyordu; artık yalnızca gereken kaç villa varsa o çekiliyor.
 */
export async function getVillasBySlugs(
  slugs: string[],
  limit = 3
): Promise<Villa[]> {
  const wanted = slugs.slice(0, Math.max(limit, 0));
  if (wanted.length === 0) return [];

  const run = (fields: string) =>
    supabaseServer()
      .from("villas")
      .select(fields)
      .eq("status", "published")
      .in("slug", wanted);

  let res = await run(VILLA_FIELDS);
  if (res.error && isMissingExtraColumns(res.error.message)) {
    res = await run(VILLA_FIELDS_BASE);
  }
  if (res.error) return [];

  const bySlug = new Map(
    (res.data as unknown as VillaRow[]).map((r) => [r.slug, mapVilla(r)])
  );
  // Kategorideki sırayı koru.
  return wanted
    .map((sl) => bySlug.get(sl))
    .filter((v): v is Villa => Boolean(v));
}

/**
 * Villa KARTI için gereken alanlar — tam `Villa` değil.
 *
 * Kart, tam villa nesnesinin yaklaşık %6'sını kullanıyor: açıklamalar (iki dilde),
 * dolu tarih blokları, sezon etiket/tarihleri, fiyat kuralları, video, giriş-çıkış
 * saatleri hiç okunmuyor. Ölçülen maliyet villa başına **14,3 KB**; bu dar tiple
 * ~0,9 KB'ye iniyor.
 *
 * `Villa` bu şekli yapısal olarak karşılar, bu yüzden `VillaCard` hem tam villa
 * hem kart verisi alabilir — mevcut çağrı yerleri değişmeden çalışır.
 */
export interface VillaCardData {
  slug: string;
  name: string;
  code?: string;
  region: string;
  province: string;
  images: string[];
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  pricePerNight: number;
  /** Yalnızca fiyat — `priceRange` min/max için başka bir şey istemiyor. */
  seasons: { price: number }[];
  rating: number;
  featured: boolean;
  discountPercent?: number;
  dealTag?: Villa["dealTag"];
}

/** Kart sorgusunun sütunları — `VILLA_FIELDS`'in çok küçük bir altkümesi. */
const CARD_FIELDS = `
  slug, name, code, capacity, bedrooms, bathrooms,
  rating, featured, discount_percent, deal_tag, base_price, amenities,
  region_id,
  regions ( name, province ),
  villa_images ( storage_path, sort_order ),
  villa_seasons ( price )
`;

interface CardRow {
  slug: string;
  name: string;
  code: string | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  rating: number | null;
  featured: boolean;
  discount_percent: number | null;
  deal_tag: Villa["dealTag"] | null;
  base_price: number;
  amenities: AmenityKey[] | null;
  region_id: string | null;
  regions: { name: string; province: string } | null;
  villa_images: { storage_path: string; sort_order: number }[];
  villa_seasons: { price: number }[];
}

function mapCard(r: CardRow): VillaCardData {
  return {
    slug: r.slug,
    name: r.name,
    code: r.code ?? undefined,
    region: r.regions?.name ?? "",
    province: r.regions?.province ?? "",
    images: [...(r.villa_images ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .slice(0, 5)
      .map((i) => imageUrl(i.storage_path)),
    capacity: r.capacity,
    bedrooms: r.bedrooms,
    bathrooms: r.bathrooms,
    pricePerNight: Number(r.base_price),
    seasons: (r.villa_seasons ?? []).map((x) => ({ price: Number(x.price) })),
    rating: Number(r.rating ?? 0),
    featured: r.featured,
    discountPercent: r.discount_percent ?? undefined,
    dealTag: r.deal_tag ?? undefined,
  };
}

/**
 * Yayındaki en yüksek gecelik taban fiyat — fiyat kaydırıcısının üst sınırı.
 *
 * Sınır eskiden kodda `25000` olarak sabitti ve hem varsayılan hem tavan
 * değerdi: gecelik tabanı bunun üstünde olan hiçbir villa HİÇBİR koşulda
 * listelenemiyordu. En yüksek komisyonlu lüks segment siteden görünmezdi.
 */
/**
 * Ana sayfa için TÜM yayınlanmış villalar — ama yalnızca kart alanlarıyla.
 *
 * Ana sayfa bunları bölge sayaçları, bölge kapak görseli ve kategori
 * satırları için kullanıyor; hiçbiri açıklama/blok/sezon detayı istemiyor.
 * Tam `Villa` ile villa başına 14,3 KB, kart tipiyle ~0,9 KB.
 */
export async function getVillaCards(): Promise<VillaCardData[]> {
  const { data, error } = await supabaseServer()
    .from("villas")
    .select(CARD_FIELDS)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("name");

  if (error) throw new Error(`Villa kartları okunamadı: ${error.message}`);
  return (data as unknown as CardRow[]).map(mapCard);
}

/**
 * Bölge başına yayınlanmış villa sayısı — alt bölgeler dahil.
 *
 * Ana sayfa eskiden TÜM villaları çekip JS'te `villas.filter(v => v.region === name)`
 * ile sayıyordu. İki sorun: (a) katalog 1.000 satırı geçince PostgREST **sessizce
 * kırpıyor** ve sayaçlar yanlışlanıyor, (b) alt bölgeler sayılmadığı için envanteri
 * olan bir il "0 villa" gösterebiliyordu.
 *
 * Burada sayımı Postgres yapıyor (gömülü `villas(count)`) ve dönen satır sayısı
 * BÖLGE sayısı kadar — villa sayısından bağımsız. Hiyerarşik toplama JS'te,
 * ~25 düğümlük ağaç üzerinde.
 *
 * Dönen anahtar: bölge **slug**'ı.
 */
export async function getRegionVillaCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabaseServer()
    .from("regions")
    .select("id, slug, parent_id, villas(count)")
    .eq("villas.status", "published");

  if (error) {
    console.error("[getRegionVillaCounts] okunamadı:", error.message);
    return new Map();
  }

  type Row = {
    id: string;
    slug: string;
    parent_id: string | null;
    villas: { count: number }[];
  };
  const rows = (data ?? []) as unknown as Row[];

  const own = new Map<string, number>();       // id -> kendi villa sayısı
  const children = new Map<string, string[]>(); // parentId -> [childId]
  const slugOf = new Map<string, string>();

  for (const r of rows) {
    own.set(r.id, r.villas?.[0]?.count ?? 0);
    slugOf.set(r.id, r.slug);
    if (r.parent_id) {
      children.set(r.parent_id, [...(children.get(r.parent_id) ?? []), r.id]);
    }
  }

  // Alt ağaç toplamı; döngüye karşı ziyaret seti (0025 DB'de de engelliyor).
  const seen = new Set<string>();
  const total = (id: string): number => {
    if (seen.has(id)) return 0;
    seen.add(id);
    const sum = (own.get(id) ?? 0) +
      (children.get(id) ?? []).reduce((a, c) => a + total(c), 0);
    seen.delete(id);
    return sum;
  };

  const out = new Map<string, number>();
  for (const r of rows) out.set(r.slug, total(r.id));
  return out;
}

/** Öne çıkan villalar — SQL'de filtrelenir ve sınırlanır. */
export async function getFeaturedVillaCards(limit = 12): Promise<VillaCardData[]> {
  const { data, error } = await supabaseServer()
    .from("villas")
    .select(CARD_FIELDS)
    .eq("status", "published")
    .eq("featured", true)
    .order("rating", { ascending: false })
    .order("name")
    .limit(limit);

  if (error) throw new Error(`Öne çıkan villalar okunamadı: ${error.message}`);
  return (data as unknown as CardRow[]).map(mapCard);
}

/**
 * Verilen slug'lara göre villa KARTLARI (sıra korunur, sınırlı).
 *
 * Ana sayfadaki kategori satırları için: her kategorinin ilk N villası yeter,
 * tüm katalog değil.
 */
export async function getVillaCardsBySlugs(
  slugs: string[],
  limit = 120
): Promise<VillaCardData[]> {
  const wanted = [...new Set(slugs)].slice(0, limit);
  if (wanted.length === 0) return [];

  const { data, error } = await supabaseServer()
    .from("villas")
    .select(CARD_FIELDS)
    .eq("status", "published")
    .in("slug", wanted);

  if (error) {
    console.error("[getVillaCardsBySlugs] okunamadı:", error.message);
    return [];
  }
  const bySlug = new Map(
    (data as unknown as CardRow[]).map((r) => [r.slug, mapCard(r)])
  );
  return wanted.map((sl) => bySlug.get(sl)).filter((v): v is VillaCardData => Boolean(v));
}

export async function getVillaPriceCeiling(): Promise<number> {
  const { data, error } = await supabaseServer()
    .from("villas")
    .select("base_price")
    .eq("status", "published")
    .order("base_price", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return 25000;
  // Yukarı yuvarla ki en pahalı villa kaydırıcının tam ucunda kalmasın.
  const max = Number(data.base_price) || 25000;
  return Math.max(5000, Math.ceil(max / 1000) * 1000);
}

export type VillaSort = "featured" | "priceAsc" | "priceDesc" | "rating";

export interface VillaListQuery {
  /** Bölge slug'ı — alt bölgeler de dahil edilir. */
  bolge?: string;
  /** Kategori slug'ı. */
  kategori?: string;
  /** Villa adında arama. */
  q?: string;
  /** Giriş tarihi (yyyy-mm-dd) — bu tarihlerde DOLU olan villalar elenir. */
  giris?: string;
  /** Çıkış tarihi (yyyy-mm-dd, hariç). */
  cikis?: string;
  kisi?: number;
  yatak?: number;
  minFiyat?: number;
  maxFiyat?: number;
  /** Yalnızca flaş indirimi olan villalar. */
  firsat?: boolean;
  /** Yalnızca öne çıkan villalar. */
  oneCikan?: boolean;
  /** N gecelik konaklamayı kabul eden villalar (min_nights ≤ N). */
  gece?: number;
  /** Fırsat etiketi: erken rezervasyon / son dakika / kısa konaklama. */
  etiket?: NonNullable<Villa["dealTag"]>;
  ozellik?: AmenityKey[];
  sirala?: VillaSort;
  sayfa?: number;
}

export const VILLAS_PAGE_SIZE = 24;

/** Bir bölgenin kendisi + tüm alt bölgelerinin id'leri. */
function descendantRegionIds(regions: Region[], slug: string): string[] {
  const root = regions.find((r) => r.slug === slug || r.name === slug);
  if (!root) return [];
  const ids = [root.id];
  const walk = (parentId: string) => {
    for (const r of regions) {
      if (r.parentId === parentId) {
        ids.push(r.id);
        walk(r.id);
      }
    }
  };
  walk(root.id);
  return ids;
}

/**
 * Herkese açık villa listesi — filtre ve sayfalama SUNUCUDA.
 *
 * Eskiden `/villalar` tüm katalogu istemciye gönderiyor ve filtreleme her tuş
 * vuruşunda tarayıcıda 600 elemanlı dizide çalışıyordu; kart başına 5 görselle
 * DOM'da 3.000 `<img>` ve 2.400 dokunma dinleyicisi oluşuyordu. Panel bunu zaten
 * doğru yapıyordu (25/sayfa `.range()`); herkese açık taraf yapmıyordu.
 */
/**
 * Verilen tarih aralığında DOLU olan villaların id'leri.
 *
 * Müsaitlik filtresi yoktu: arama çubuğunda tarih seçen kullanıcının karşısına
 * dolu villalar da çıkıyordu. Kullanıcı bir villaya giriyor, takvimde "dolu"
 * görüyor, geri dönüyor — bu döngü birkaç kez tekrarlanınca siteyi terk ediyor.
 *
 * Aralık yarı açık: `[giris, cikis)`. Bir blok çakışıyorsa (`starts_on < cikis`
 * ve `ends_on > giris`) villa o aralıkta satılamaz. Dönen satır sayısı o
 * penceredeki BLOK sayısı kadar — katalog büyüklüğünden bağımsız.
 */
async function bookedVillaIds(giris: string, cikis: string): Promise<string[]> {
  const { data, error } = await supabaseServer()
    .from("villa_blocks")
    .select("villa_id")
    .lt("starts_on", cikis)
    .gt("ends_on", giris);

  if (error) {
    console.error("[bookedVillaIds] okunamadı:", error.message);
    return [];
  }
  return [...new Set((data ?? []).map((b) => b.villa_id as string))];
}

export async function getVillaCardPage(
  f: VillaListQuery,
  regions: Region[],
  categoryVillaSlugs?: string[]
): Promise<{
  items: VillaCardData[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const page = Math.max(1, f.sayfa ?? 1);
  const offset = (page - 1) * VILLAS_PAGE_SIZE;

  let q = supabaseServer()
    .from("villas")
    .select(CARD_FIELDS, { count: "exact" })
    .eq("status", "published");

  if (f.bolge) {
    const ids = descendantRegionIds(regions, f.bolge);
    // Bölge çözülemezse boş sonuç dön — eskiden bilinmeyen slug tüm listeyi
    // gösteriyordu (ve sayfa yine 200 dönüyordu).
    if (ids.length === 0) {
      return { items: [], total: 0, page, pageCount: 1 };
    }
    q = q.in("region_id", ids);
  }

  if (categoryVillaSlugs) {
    if (categoryVillaSlugs.length === 0) {
      return { items: [], total: 0, page, pageCount: 1 };
    }
    q = q.in("slug", categoryVillaSlugs);
  }

  // Müsaitlik: seçilen aralıkta dolu olanları ele.
  if (f.giris && f.cikis && f.cikis > f.giris) {
    const dolu = await bookedVillaIds(f.giris, f.cikis);
    if (dolu.length) q = q.not("id", "in", `(${dolu.join(",")})`);
  }

  if (f.q) q = q.ilike("name", `%${f.q.replace(/[%_,()]/g, " ")}%`);
  if (f.kisi) q = q.gte("capacity", f.kisi);
  if (f.yatak) q = q.gte("bedrooms", f.yatak);
  if (f.minFiyat) q = q.gte("base_price", f.minFiyat);
  if (f.maxFiyat) q = q.lte("base_price", f.maxFiyat);
  if (f.ozellik?.length) q = q.contains("amenities", f.ozellik);
  if (f.firsat) q = q.gt("discount_percent", 0);
  if (f.oneCikan) q = q.eq("featured", true);
  if (f.gece) q = q.lte("min_nights", f.gece);
  if (f.etiket) q = q.eq("deal_tag", f.etiket);

  q =
    f.sirala === "priceAsc"
      ? q.order("base_price", { ascending: true })
      : f.sirala === "priceDesc"
        ? q.order("base_price", { ascending: false })
        : f.sirala === "rating"
          ? q.order("rating", { ascending: false })
          : q.order("featured", { ascending: false }).order("rating", {
              ascending: false,
            });

  const { data, count, error } = await q.range(offset, offset + VILLAS_PAGE_SIZE - 1);

  if (error) {
    // Kullanıcı elle `?sayfa=99` yazarsa (veya filtre daraldıktan sonra eski
    // sayfada kalırsa) PostgREST 416 "Requested range not satisfiable" döner.
    // Bu bir hata değil, "bu sayfada kayıt yok" demektir — 500 basma.
    const outOfRange =
      error.code === "PGRST103" || /range not satisfiable/i.test(error.message);
    if (outOfRange) {
      return { items: [], total: count ?? 0, page, pageCount: 1 };
    }
    throw new Error(`Villalar okunamadı: ${error.message}`);
  }

  const total = count ?? 0;
  return {
    items: (data as unknown as CardRow[]).map(mapCard),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / VILLAS_PAGE_SIZE)),
  };
}

export interface Region {
  id: string;
  slug: string;
  name: string;
  province: string;
  parentId: string | null;
  parentSlug: string | null;
  parentName: string | null;
  depth: number;
  /** Bölge kartı görseli. Panelden yüklenmediyse null — kart o zaman bölgedeki
   *  bir villanın fotoğrafına düşer (bkz. HomeClient). */
  heroImage: string | null;
}

export async function getRegions(): Promise<Region[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("regions")
    .select("id, slug, name, province, parent_id, depth, hero_image")
    .order("sort_order");

  if (error) {
    // Sütunlar henüz migration uygulanmadığı için yoksa fallback yap
    if (error.message.includes("parent_id")) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("regions")
        .select("id, slug, name, province, hero_image")
        .order("sort_order");

      if (fallbackError) throw new Error(`Bölgeler okunamadı: ${fallbackError.message}`);
      return (fallbackData ?? []).map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        province: r.province,
        parentId: null,
        parentSlug: null,
        parentName: null,
        depth: 0,
        heroImage: imageUrl(r.hero_image),
      }));
    }
    throw new Error(`Bölgeler okunamadı: ${error.message}`);
  }

  const rows = data ?? [];
  const map = new Map(rows.map((r) => [r.id, r]));

  return rows.map((r) => {
    const parent = r.parent_id ? map.get(r.parent_id) : null;
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      province: parent ? parent.name : r.province,
      parentId: r.parent_id ?? null,
      parentSlug: parent ? parent.slug : null,
      parentName: parent ? parent.name : null,
      depth: r.depth ?? 0,
      heroImage: imageUrl(r.hero_image),
    };
  });
}

/**
 * Ana sayfadaki rozet ve kutucuk sayıları.
 *
 * Bu sayılar SABİT YAZILIYDI: `ShortStayDeals` "2 gece → 39 villa, 3 gece → 90
 * villa …" diyordu ve ana sayfada "242+ villa müsait" yazıyordu. Sitede o gün
 * 21 villa vardı. Arama çubuğundaki "Fırsatlar"/"Kampanya" sekmeleri de rozet
 * taşıyordu ama arkalarında hiçbir filtre yoktu — ikisi de düz `/villalar`'a
 * gidiyordu.
 *
 * Satır ÇEKİLMEZ (`head: true`): yalnızca Postgres'in saydığı rakam döner.
 * Katalog kaç bin villaya çıkarsa çıksın maliyet aynı kalır ve PostgREST'in
 * 1.000 satırlık sessiz kırpması bu sorguları hiç ilgilendirmez.
 */
export interface VillaFacetCounts {
  /** Flaş indirimi olan villa sayısı. */
  firsat: number;
  /** Öne çıkan villa sayısı. */
  oneCikan: number;
  /** "Erken rezervasyon" etiketli villa sayısı. */
  erken: number;
  /** Gece sayısına göre: `{ 2: 14, 3: 21, ... }` */
  gece: Record<number, number>;
  /** Yayındaki toplam villa. */
  toplam: number;
}

export async function getVillaFacetCounts(): Promise<VillaFacetCounts> {
  const base = () =>
    supabaseServer()
      .from("villas")
      .select("id", { count: "exact", head: true })
      .eq("status", "published");

  const geceler = [2, 3, 4, 5];
  const [firsat, oneCikan, erken, toplam, ...geceSonuc] = await Promise.all([
    base().gt("discount_percent", 0),
    base().eq("featured", true),
    base().eq("deal_tag", "earlyBooking"),
    base(),
    ...geceler.map((n) => base().lte("min_nights", n)),
  ]);

  return {
    firsat: firsat.count ?? 0,
    oneCikan: oneCikan.count ?? 0,
    erken: erken.count ?? 0,
    toplam: toplam.count ?? 0,
    gece: Object.fromEntries(geceler.map((n, i) => [n, geceSonuc[i].count ?? 0])),
  };
}
