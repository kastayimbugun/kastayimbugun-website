import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import type { AmenityKey, PoolType } from "@/lib/types";

export type VillaStatus = "draft" | "published" | "archived";

/** Storage yolunu tam public URL'ye çevirir (demo veride zaten tam URL gelebilir). */
export function imageUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/villa-images/${path}`;
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
       pool, size_m2, distance_to_sea, rating, review_count, featured,
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
