import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import type { AmenityKey, PoolType } from "@/lib/types";

export type VillaStatus = "draft" | "published" | "archived";

/** Storage yolunu tam public URL'ye çevirir (demo veride zaten tam URL gelebilir). */
export function imageUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/villa-images/${path}`;
}

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

export interface VillaPricingOption {
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
       regions ( name ),
       villa_seasons ( starts_on, ends_on, price ),
       villa_blocks ( starts_on, ends_on, source, note ),
       booking_requests ( full_name, check_in, check_out, status )`
    )
    .neq("status", "archived")
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
  status: VillaStatus;
  basePrice: number;
  regionName: string;
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
  serviceRate: number;
  descriptionTr: string | null;
  descriptionEn: string | null;
  videoUrl: string | null;
  amenities: AmenityKey[];
  images: AdminImage[];
}

export async function getVillaForEdit(
  id: string
): Promise<AdminVillaFull | null> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villas")
    .select(
      `id, slug, name, code, region_id, status, capacity, bedrooms, bathrooms,
       pool, size_m2, distance_to_sea,
       distance_airport_km, distance_market_km, distance_restaurant_km,
       distance_transit_km, distance_center_km,
       rating, review_count, featured,
       discount_percent, deal_tag, check_in, check_out, min_nights,
       base_price, cleaning_fee, service_rate, description_tr, description_en,
       video_url, amenities,
       villa_images ( id, storage_path, sort_order, alt_tr )`
    )
    .eq("id", id)
    .maybeSingle();

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
    slug: r.slug as string,
    name: r.name as string,
    code: (r.code as string) ?? null,
    regionId: (r.region_id as string) ?? null,
    status: r.status as VillaStatus,
    capacity: r.capacity as number,
    bedrooms: r.bedrooms as number,
    bathrooms: r.bathrooms as number,
    pool: r.pool as PoolType,
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
    serviceRate: Number(r.service_rate ?? 0.05),
    descriptionTr: (r.description_tr as string) ?? null,
    descriptionEn: (r.description_en as string) ?? null,
    videoUrl: (r.video_url as string) ?? null,
    amenities: (r.amenities as AmenityKey[]) ?? [],
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

/** Panelde tüm villalar (taslak dahil; RLS staff'e izin verir). */
export async function getAdminVillas(): Promise<AdminVillaListItem[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villas")
    .select("id, name, slug, status, base_price, regions ( name )")
    .order("name");
  if (error) throw new Error(`Villalar okunamadı: ${error.message}`);

  return (data as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    status: VillaStatus;
    base_price: number;
    regions: { name: string } | null;
  }>).map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    status: v.status,
    basePrice: Number(v.base_price),
    regionName: v.regions?.name ?? "—",
  }));
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
