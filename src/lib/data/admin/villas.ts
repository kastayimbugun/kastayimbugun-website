import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { safeTerm } from "./searchTerm";
import { villaQuality } from "@/lib/villaQuality";
import type { AmenityKey, PoolType } from "@/lib/types";
import type { PriceRules } from "@/lib/pricing";
import { businessToday } from "@/lib/format";
import { imageUrl } from "@/lib/images/url";

export type VillaStatus = "draft" | "published" | "archived";


export interface VillaOption {
  id: string;
  name: string;
}

/**
 * Hafif villa listesi (id + ad) — açılır menüler ve seçim listeleri için.
 * Kategori villa atama ekranı ile talep filtresi aynı kaynağı kullanır.
 */
export async function getVillaOptions(): Promise<VillaOption[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villas")
    .select("id, name")
    .order("name");
  if (error) throw new Error(`Villalar okunamadı: ${error.message}`);
  return data as VillaOption[];
}

/**
 * `calcPrice`'in ihtiyac duydugu HER sey — fiyat kurallari dahil (PriceRules).
 * Kurallar eskiden bu tipte ve sorguda yoktu: panel formlari `calcPrice`'i eksik
 * nesneyle cagiriyor, `pct()` tanimsizi 0'a cevirdigi icin hafta sonu primi,
 * 7+/28+ gece indirimi, son dakika indirimi ve kapasite ustu ucret SESSIZCE
 * uygulanmiyordu. Site tarafi bunlari uyguladigi icin ayni konaklama icin panel
 * ve site farkli tutar veriyordu.
 */
export interface VillaPricingOption extends PriceRules {
  id: string;
  name: string;
  regionName: string;
  capacity: number;
  minNights: number;
  pricePerNight: number;
  cleaningFee: number;
  serviceRate: number;
  seasons: { start: string; end: string; price: number }[];
  /**
   * Dolu/kapalı tarih aralıkları + panelde günün üstüne gelince görünecek not
   * ("kim kiralamış" — yalnızca panelde, herkese açık sitede geçilmez).
   * Onaylı rezervasyona denk gelen blokta misafir adı, elle kapatılmış blokta
   * varsa panel notu, hiçbiri yoksa genel "Kapalı" gösterilir.
   */
  bookedRanges: { start: string; end: string; note: string }[];
}

/**
 * Manuel rezervasyon formu için villa listesi — `calcPrice`'ın (lib/pricing.ts)
 * ihtiyaç duyduğu alanlarla birlikte. Arşivlenmiş villalar hariç: taslak dahil
 * (henüz yayına girmemiş bir villaya da telefonla rezervasyon alınabilir).
 */
export async function getVillaPricingOptions(): Promise<VillaPricingOption[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villas")
    .select(
      `id, name, capacity, min_nights, base_price, cleaning_fee, service_rate,
       weekend_premium_percent, los_weekly_discount_percent,
       los_monthly_discount_percent, last_minute_discount_percent,
       last_minute_days, extra_guest_fee, extra_guest_after,
       regions ( name ),
       villa_seasons ( starts_on, ends_on, price ),
       villa_blocks ( starts_on, ends_on, source, note ),
       booking_requests ( full_name, check_in, check_out, status )`
    )
    .neq("status", "archived")
    // Gömülü rezervasyonları daralt: yalnızca ONAYLI ve BUGÜNDEN SONRA biten
    // kayıtlar. Eskiden her villanın TÜM rezervasyon geçmişi (misafir adlarıyla)
    // tarayıcıya iniyordu — yıllar geçtikçe sınırsız büyüyen bir PII yüküydü ve
    // takvimde yalnızca gelecekteki dolu günler için ada ihtiyaç var.
    .eq("booking_requests.status", "confirmed")
    .gte("booking_requests.check_out", businessToday())
    .order("name");
  if (error) throw new Error(`Villalar okunamadı: ${error.message}`);

  return (
    data as unknown as Array<{
      id: string;
      name: string;
      capacity: number;
      min_nights: number;
      base_price: number;
      cleaning_fee: number;
      service_rate: number;
      weekend_premium_percent: number | null;
      los_weekly_discount_percent: number | null;
      los_monthly_discount_percent: number | null;
      last_minute_discount_percent: number | null;
      last_minute_days: number | null;
      extra_guest_fee: number | null;
      extra_guest_after: number | null;
      regions: { name: string } | null;
      villa_seasons: { starts_on: string; ends_on: string; price: number }[];
      villa_blocks: {
        starts_on: string;
        ends_on: string;
        source: string;
        note: string | null;
      }[];
      booking_requests: {
        full_name: string;
        check_in: string;
        check_out: string;
        status: string;
      }[];
    }>
  ).map((v) => {
    const confirmed = v.booking_requests.filter((b) => b.status === "confirmed");
    return {
      id: v.id,
      name: v.name,
      regionName: v.regions?.name ?? "",
      capacity: v.capacity,
      minNights: v.min_nights,
      pricePerNight: Number(v.base_price),
      cleaningFee: Number(v.cleaning_fee ?? 0),
      serviceRate: Number(v.service_rate ?? 0.05),
      weekendPremiumPercent: v.weekend_premium_percent,
      losWeeklyDiscountPercent: v.los_weekly_discount_percent,
      losMonthlyDiscountPercent: v.los_monthly_discount_percent,
      lastMinuteDiscountPercent: v.last_minute_discount_percent,
      lastMinuteDays: v.last_minute_days,
      extraGuestFee: v.extra_guest_fee,
      extraGuestAfter: v.extra_guest_after,
      seasons: v.villa_seasons.map((s) => ({
        start: s.starts_on,
        end: s.ends_on,
        price: Number(s.price),
      })),
      bookedRanges: v.villa_blocks.map((b) => {
        // Bloğun tam tarih aralığına denk gelen onaylı talep varsa misafir
        // adı gösterilir — villa_blocks'ta booking_requests'e FK yok, bu yüzden
        // aynı villa+tarih aralığıyla eşleştirilir (updateBookingStatus'un
        // bloğu yazma şekliyle aynı varsayım).
        const guest = confirmed.find(
          (r) => r.check_in === b.starts_on && r.check_out === b.ends_on
        );
        const note =
          guest?.full_name ?? b.note ?? (b.source === "booking" ? "Rezervasyon" : "Kapalı");
        return { start: b.starts_on, end: b.ends_on, note };
      }),
    };
  });
}

export interface AdminVillaListItem {
  id: string;
  name: string;
  slug: string;
  /** Tesis kodu (KBV1234) — listede aramayla eşleşir. */
  code: string | null;
  status: VillaStatus;
  basePrice: number;
  regionName: string;
  /** İçerik kalite skoru (0–100) ve eksikler (yol haritası 4.1). */
  quality: import("@/lib/villaQuality").VillaQuality;
}

export interface AdminSeason {
  id: string;
  labelTr: string;
  labelEn: string;
  startsOn: string;
  endsOn: string;
  price: number;
}

export interface AdminBlock {
  id: string;
  startsOn: string;
  endsOn: string;
  source: "manual" | "booking" | "ical";
  note: string | null;
}

export interface AdminVillaDetail {
  id: string;
  name: string;
  slug: string;
  status: VillaStatus;
  seasons: AdminSeason[];
  blocks: AdminBlock[];
}

export interface AdminImage {
  id: string;
  url: string;
  storagePath: string;
  sortOrder: number;
  altTr: string | null;
}

/** Villa düzenleme formu için TÜM alanlar + görseller. */
export interface AdminVillaFull {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  regionId: string | null;
  status: VillaStatus;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  pool: PoolType;
  poolWidth: number | null;
  poolLength: number | null;
  poolDepth: number | null;
  sizeM2: number | null;
  distanceToSea: number | null;
  distanceAirportKm: number | null;
  distanceMarketKm: number | null;
  distanceRestaurantKm: number | null;
  distanceTransitKm: number | null;
  distanceCenterKm: number | null;
  rating: number;
  reviewCount: number;
  featured: boolean;
  discountPercent: number | null;
  dealTag: string | null;
  checkIn: string;
  checkOut: string;
  minNights: number;
  basePrice: number;
  cleaningFee: number;
  damageDeposit: number | null;
  ministryCertNo: string | null;
  serviceRate: number;
  weekendPremiumPercent: number | null;
  losWeeklyDiscountPercent: number | null;
  losMonthlyDiscountPercent: number | null;
  lastMinuteDiscountPercent: number | null;
  lastMinuteDays: number | null;
  extraGuestFee: number | null;
  extraGuestAfter: number | null;
  descriptionTr: string | null;
  descriptionEn: string | null;
  videoUrl: string | null;
  amenities: AmenityKey[];
  categoryIds: string[];
  images: AdminImage[];
  /**
   * Formun okuduğu sürüm damgası. Kaydederken geri gönderilir; satır o sırada
   * başkası tarafından değiştirilmişse yazma reddedilir (bkz. docs/panel-kurallari.md §3).
   */
  updatedAt: string;
}

export async function getVillaForEdit(
  id: string
): Promise<AdminVillaFull | null> {
  const supabase = await supabaseSession();
  const baseCols = `id, slug, name, code, region_id, status, capacity, bedrooms, bathrooms,
       pool, size_m2, distance_to_sea,
       distance_airport_km, distance_market_km, distance_restaurant_km,
       distance_transit_km, distance_center_km,
       rating, review_count, featured,
       discount_percent, deal_tag, check_in, check_out, min_nights,
       base_price, cleaning_fee, service_rate,
       weekend_premium_percent, los_weekly_discount_percent,
       los_monthly_discount_percent, last_minute_discount_percent,
       last_minute_days, extra_guest_fee, extra_guest_after,
       description_tr, description_en,
       video_url, amenities, updated_at,
       villa_images ( id, storage_path, sort_order, alt_tr ),
       villa_categories ( category_id )`;
  const extraCols = `pool_width, pool_length, pool_depth, damage_deposit, ministry_cert_no`;

  let { data, error } = await supabase
    .from("villas")
    .select(`${baseCols}, ${extraCols}`)
    .eq("id", id)
    .maybeSingle();

  // 0019 kolonları yoksa bunlar olmadan tekrar dene.
  if (error && /pool_width|pool_length|pool_depth|damage_deposit|ministry_cert_no/.test(error.message ?? "")) {
    ({ data, error } = await supabase
      .from("villas")
      .select(baseCols)
      .eq("id", id)
      .maybeSingle());
  }

  if (error) throw new Error(`Villa okunamadı: ${error.message}`);
  if (!data) return null;

  const hhmm = (t: string) => t.slice(0, 5);
  const r = data as Record<string, unknown>;
  const imgs = (r.villa_images as Array<{
    id: string;
    storage_path: string;
    sort_order: number;
    alt_tr: string | null;
  }>) ?? [];

  return {
    id: r.id as string,
    updatedAt: r.updated_at as string,
    slug: r.slug as string,
    name: r.name as string,
    code: (r.code as string) ?? null,
    regionId: (r.region_id as string) ?? null,
    status: r.status as VillaStatus,
    capacity: r.capacity as number,
    bedrooms: r.bedrooms as number,
    bathrooms: r.bathrooms as number,
    pool: r.pool as PoolType,
    poolWidth: (r.pool_width as number) ?? null,
    poolLength: (r.pool_length as number) ?? null,
    poolDepth: (r.pool_depth as number) ?? null,
    sizeM2: (r.size_m2 as number) ?? null,
    distanceToSea: (r.distance_to_sea as number) ?? null,
    distanceAirportKm: (r.distance_airport_km as number) ?? null,
    distanceMarketKm: (r.distance_market_km as number) ?? null,
    distanceRestaurantKm: (r.distance_restaurant_km as number) ?? null,
    distanceTransitKm: (r.distance_transit_km as number) ?? null,
    distanceCenterKm: (r.distance_center_km as number) ?? null,
    rating: Number(r.rating ?? 0),
    reviewCount: (r.review_count as number) ?? 0,
    featured: Boolean(r.featured),
    discountPercent: (r.discount_percent as number) ?? null,
    dealTag: (r.deal_tag as string) ?? null,
    checkIn: hhmm(r.check_in as string),
    checkOut: hhmm(r.check_out as string),
    minNights: r.min_nights as number,
    basePrice: Number(r.base_price),
    cleaningFee: Number(r.cleaning_fee ?? 0),
    damageDeposit: (r.damage_deposit as number) ?? null,
    ministryCertNo: (r.ministry_cert_no as string) ?? null,
    serviceRate: Number(r.service_rate ?? 0.05),
    weekendPremiumPercent: (r.weekend_premium_percent as number) ?? null,
    losWeeklyDiscountPercent: (r.los_weekly_discount_percent as number) ?? null,
    losMonthlyDiscountPercent: (r.los_monthly_discount_percent as number) ?? null,
    lastMinuteDiscountPercent: (r.last_minute_discount_percent as number) ?? null,
    lastMinuteDays: (r.last_minute_days as number) ?? null,
    extraGuestFee:
      r.extra_guest_fee != null ? Number(r.extra_guest_fee) : null,
    extraGuestAfter: (r.extra_guest_after as number) ?? null,
    descriptionTr: (r.description_tr as string) ?? null,
    descriptionEn: (r.description_en as string) ?? null,
    videoUrl: (r.video_url as string) ?? null,
    amenities: (r.amenities as AmenityKey[]) ?? [],
    categoryIds: ((r.villa_categories as { category_id: string }[]) ?? []).map(
      (c) => c.category_id
    ),
    images: imgs
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((i) => ({
        id: i.id,
        url: imageUrl(i.storage_path),
        storagePath: i.storage_path,
        sortOrder: i.sort_order,
        altTr: i.alt_tr,
      })),
  };
}

export const VILLAS_PAGE_SIZE = 25;

export interface AdminVillaFilters {
  status?: VillaStatus;
  /** Varsayılan görünümde arşiv gizlenir; durum sekmesiyle geri getirilir. */
  excludeStatus?: VillaStatus;
  q?: string;
  regionId?: string;
  sort?: "name" | "price" | "new";
  page?: number;
}

export interface AdminVillaPage {
  total: number;
  page: number;
  pageCount: number;
  rows: AdminVillaListItem[];
}

/**
 * Durum DIŞINDAKİ filtreleri uygular. Durum ayrı tutulur çünkü rozet sayıları
 * "aynı filtrede her durumdan kaç tane var" sorusuna cevap verir.
 */
function withVillaFilters(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  f: AdminVillaFilters,
  select: string,
  options?: { count: "exact"; head: boolean }
) {
  let q = supabase.from("villas").select(select, options);

  if (f.regionId) q = q.eq("region_id", f.regionId);

  const term = f.q ? safeTerm(f.q) : "";
  if (term) {
    q = q.or(`name.ilike.%${term}%,slug.ilike.%${term}%,code.ilike.%${term}%`);
  }
  return q;
}

/**
 * Panel villa listesi: sunucu tarafı arama + filtre + sayfalama
 * (docs/panel-kurallari.md §5 — liste istemcide değil veritabanında daralır).
 *
 * Arşivlenmiş villalar varsayılan görünümde gizlenir: soft-delete'in eksik
 * kalan kullanıcı tarafı. Silinen kayıt listeyi kirletmemeli ama durum
 * sekmesinden erişilebilir kalmalı — kayıt gerçekten silinmiyor.
 */
export async function getAdminVillas(
  f: AdminVillaFilters = {}
): Promise<AdminVillaPage> {
  const supabase = await supabaseSession();
  const page = Math.max(1, Math.trunc(f.page ?? 1));
  const offset = (page - 1) * VILLAS_PAGE_SIZE;

  let query = withVillaFilters(
    supabase,
    f,
    `id, name, slug, code, status, base_price, min_nights,
     description_tr, description_en, regions ( name ),
     villa_images ( count ), villa_seasons ( count )`,
    { count: "exact", head: false }
  );

  if (f.status) query = query.eq("status", f.status);
  else if (f.excludeStatus) query = query.neq("status", f.excludeStatus);

  query =
    f.sort === "price"
      ? query.order("base_price", { ascending: false })
      : f.sort === "new"
        ? query.order("created_at", { ascending: false })
        : query.order("name");

  const { data, error, count } = await query.range(
    offset,
    offset + VILLAS_PAGE_SIZE - 1
  );
  if (error) throw new Error(`Villalar okunamadı: ${error.message}`);

  const total = count ?? 0;
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / VILLAS_PAGE_SIZE)),
    rows: (data as unknown as Array<{
      id: string;
      name: string;
      slug: string;
      code: string | null;
      status: VillaStatus;
      base_price: number;
      min_nights: number | null;
      description_tr: string | null;
      description_en: string | null;
      regions: { name: string } | null;
      villa_images: { count: number }[];
      villa_seasons: { count: number }[];
    }>).map((v) => ({
      id: v.id,
      name: v.name,
      slug: v.slug,
      code: v.code,
      status: v.status,
      basePrice: Number(v.base_price),
      regionName: v.regions?.name ?? "—",
      quality: villaQuality({
        descriptionTr: v.description_tr,
        descriptionEn: v.description_en,
        imageCount: v.villa_images?.[0]?.count ?? 0,
        basePrice: Number(v.base_price),
        seasonCount: v.villa_seasons?.[0]?.count ?? 0,
        minNights: v.min_nights,
      }),
    })),
  };
}

/**
 * Durum başına villa sayısı (filtre sekmelerindeki rozetler).
 * Durum başına `count:"exact", head:true` — satır gövdesi hiç taşınmaz,
 * PostgREST'in satır sınırına takılıp sayı sessizce yanlışlanamaz.
 */
export async function getVillaCounts(
  f: AdminVillaFilters = {}
): Promise<Record<VillaStatus, number>> {
  const supabase = await supabaseSession();
  const statuses: VillaStatus[] = ["published", "draft", "archived"];

  const entries = await Promise.all(
    statuses.map(async (status) => {
      const { count, error } = await withVillaFilters(supabase, f, "id", {
        count: "exact",
        head: true,
      }).eq("status", status);
      if (error) throw new Error(`Villa sayıları okunamadı: ${error.message}`);
      return [status, count ?? 0] as const;
    })
  );

  return Object.fromEntries(entries) as Record<VillaStatus, number>;
}

/** Tek villa: temel bilgi + sezonlar + bloklar. */
export async function getAdminVilla(
  id: string
): Promise<AdminVillaDetail | null> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villas")
    .select(
      `id, name, slug, status,
       villa_seasons ( id, label_tr, label_en, starts_on, ends_on, price ),
       villa_blocks ( id, starts_on, ends_on, source, note )`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Villa okunamadı: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    slug: string;
    status: VillaStatus;
    villa_seasons: Array<{
      id: string;
      label_tr: string;
      label_en: string;
      starts_on: string;
      ends_on: string;
      price: number;
    }>;
    villa_blocks: Array<{
      id: string;
      starts_on: string;
      ends_on: string;
      source: "manual" | "booking" | "ical";
      note: string | null;
    }>;
  };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    seasons: [...row.villa_seasons]
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
      .map((s) => ({
        id: s.id,
        labelTr: s.label_tr,
        labelEn: s.label_en,
        startsOn: s.starts_on,
        endsOn: s.ends_on,
        price: Number(s.price),
      })),
    blocks: [...row.villa_blocks]
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
      .map((b) => ({
        id: b.id,
        startsOn: b.starts_on,
        endsOn: b.ends_on,
        source: b.source,
        note: b.note,
      })),
  };
}
