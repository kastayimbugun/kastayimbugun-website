"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  seasonSchema,
  updateSeasonSchema,
  blockSchema,
  deleteChildSchema,
  villaFormSchema,
  updateVillaSchema,
  type VillaFormInput,
} from "@/lib/schemas/adminVilla";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";
import { revalidateVilla } from "./revalidate";

export type VillaChildResult =
  | { ok: true }
  | {
      ok: false;
      error: "auth" | "validation" | "conflict" | "generic";
      fields?: Record<string, string>;
    };

// ---- Villa temel alanları ----

/** Form alanlarını DB sütunlarına çevirir. */
function toVillaRow(d: VillaFormInput) {
  return {
    name: d.name,
    slug: d.slug,
    region_id: d.regionId,
    status: d.status,
    capacity: d.capacity,
    bedrooms: d.bedrooms,
    bathrooms: d.bathrooms,
    pool: d.pool,
    size_m2: d.sizeM2,
    distance_to_sea: d.distanceToSea,
    distance_airport_km: d.distanceAirportKm,
    distance_market_km: d.distanceMarketKm,
    distance_restaurant_km: d.distanceRestaurantKm,
    distance_transit_km: d.distanceTransitKm,
    distance_center_km: d.distanceCenterKm,
    rating: d.rating,
    review_count: d.reviewCount,
    featured: d.featured,
    discount_percent: d.discountPercent,
    deal_tag: d.dealTag,
    check_in: d.checkIn,
    check_out: d.checkOut,
    min_nights: d.minNights,
    base_price: d.basePrice,
    cleaning_fee: d.cleaningFee,
    service_rate: d.serviceRate,
    description_tr: d.descriptionTr,
    description_en: d.descriptionEn,
    video_url: d.videoUrl,
    amenities: d.amenities,
  };
}

export type VillaSaveResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: "auth" | "validation" | "slug" | "generic";
      /** Alan adı → Türkçe hata mesajı; form bunları alan altında gösterir. */
      fields?: Record<string, string>;
    };

export async function updateVilla(input: unknown): Promise<VillaSaveResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateVillaSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }
  const { id, ...fields } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villas")
    .update(toVillaRow(fields))
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu kısa ad başka villada kullanılıyor." },
      };
    }
    return { ok: false, error: "generic" };
  }

  await revalidateVilla(supabase, id);
  return { ok: true, id };
}

export async function createVilla(input: unknown): Promise<VillaSaveResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = villaFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }

  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villas")
    .insert(toVillaRow(parsed.data))
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu kısa ad başka villada kullanılıyor." },
      };
    }
    return { ok: false, error: "generic" };
  }

  revalidatePath("/yonetim/villalar");
  revalidatePath("/", "layout");
  return { ok: true, id: data.id };
}

// ---- Sezon fiyatları ----

export async function addSeason(input: unknown): Promise<VillaChildResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = seasonSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase.from("villa_seasons").insert({
    villa_id: d.villaId,
    label_tr: d.labelTr,
    label_en: d.labelEn,
    starts_on: d.startsOn,
    ends_on: d.endsOn,
    price: d.price,
  });
  if (error) return { ok: false, error: "generic" };

  await revalidateVilla(supabase, d.villaId);
  return { ok: true };
}

export async function updateSeason(input: unknown): Promise<VillaChildResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateSeasonSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_seasons")
    .update({
      label_tr: d.labelTr,
      label_en: d.labelEn,
      starts_on: d.startsOn,
      ends_on: d.endsOn,
      price: d.price,
    })
    .eq("id", d.id)
    .eq("villa_id", d.villaId);
  if (error) return { ok: false, error: "generic" };

  await revalidateVilla(supabase, d.villaId);
  return { ok: true };
}

export async function deleteSeason(input: unknown): Promise<VillaChildResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = deleteChildSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_seasons")
    .delete()
    .eq("id", parsed.data.id)
    .eq("villa_id", parsed.data.villaId);
  if (error) return { ok: false, error: "generic" };

  await revalidateVilla(supabase, parsed.data.villaId);
  return { ok: true };
}

// ---- Takvim / kapalı tarihler ----

export async function addBlock(input: unknown): Promise<VillaChildResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase.from("villa_blocks").insert({
    villa_id: d.villaId,
    starts_on: d.startsOn,
    ends_on: d.endsOn,
    source: "manual",
    note: d.note || null,
  });
  if (error) {
    // 23P01 = exclusion_violation (tarihler zaten dolu/kapalı)
    if (error.code === "23P01") return { ok: false, error: "conflict" };
    return { ok: false, error: "generic" };
  }

  await revalidateVilla(supabase, d.villaId);
  return { ok: true };
}

export async function removeBlock(input: unknown): Promise<VillaChildResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = deleteChildSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  // Yalnızca elle eklenen bloklar buradan silinir. Onaylı rezervasyon (source='booking')
  // blokları Talepler ekranından yönetilir — kazara serbest bırakılmasın.
  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_blocks")
    .delete()
    .eq("id", parsed.data.id)
    .eq("villa_id", parsed.data.villaId)
    .eq("source", "manual");
  if (error) return { ok: false, error: "generic" };

  await revalidateVilla(supabase, parsed.data.villaId);
  return { ok: true };
}
