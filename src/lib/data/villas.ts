import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images/url";
import type { Villa, AmenityKey, PoolType } from "@/lib/types";

/**
 * Villa veri erişim katmanı. Sayfalar doğrudan Supabase'e değil buraya konuşur.
 * Dönen nesneler arayüzün beklediği Villa şeklindedir, bileşenler değişmez.
 */

const VILLA_FIELDS = `
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

interface VillaRow {
  slug: string;
  name: string;
  code: string | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  pool: PoolType;
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
  const { data, error } = await supabaseServer()
    .from("villas")
    .select(VILLA_FIELDS)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("name");

  if (error) throw new Error(`Villalar okunamadı: ${error.message}`);
  return (data as unknown as VillaRow[]).map(mapVilla);
}

export async function getVilla(slug: string): Promise<Villa | null> {
  const { data, error } = await supabaseServer()
    .from("villas")
    .select(VILLA_FIELDS)
    .eq("status", "published")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Villa okunamadı (${slug}): ${error.message}`);
  return data ? mapVilla(data as unknown as VillaRow) : null;
}

export async function getVillaSlugs(): Promise<string[]> {
  const { data, error } = await supabaseServer()
    .from("villas")
    .select("slug")
    .eq("status", "published");

  if (error) throw new Error(`Villa slug'ları okunamadı: ${error.message}`);
  return data.map((v) => v.slug);
}

export async function getFeatured(): Promise<Villa[]> {
  const villas = await getVillas();
  return villas.filter((v) => v.featured);
}

export interface Region {
  slug: string;
  name: string;
  province: string;
  /** Bölge kartı görseli. Panelden yüklenmediyse null — kart o zaman bölgedeki
   *  bir villanın fotoğrafına düşer (bkz. HomeClient). */
  heroImage: string | null;
}

export async function getRegions(): Promise<Region[]> {
  const { data, error } = await supabaseServer()
    .from("regions")
    .select("slug, name, province, hero_image")
    .order("sort_order");

  if (error) throw new Error(`Bölgeler okunamadı: ${error.message}`);
  return data.map((r) => ({
    slug: r.slug,
    name: r.name,
    province: r.province,
    heroImage: imageUrl(r.hero_image),
  }));
}
