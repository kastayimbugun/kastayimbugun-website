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

/** Form alanlarını DB sütunlarına çevirir. `categoryIds` ayrı tabloya gider. */
function toVillaRow(d: Omit<VillaFormInput, "categoryIds">) {
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
    weekend_premium_percent: d.weekendPremiumPercent,
    los_weekly_discount_percent: d.losWeeklyDiscountPercent,
    los_monthly_discount_percent: d.losMonthlyDiscountPercent,
    last_minute_discount_percent: d.lastMinuteDiscountPercent,
    last_minute_days: d.lastMinuteDays,
    extra_guest_fee: d.extraGuestFee,
    extra_guest_after: d.extraGuestAfter,
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
      error: "auth" | "validation" | "slug" | "generic" | "conflict";
      /** Alan adı → Türkçe hata mesajı; form bunları alan altında gösterir. */
      fields?: Record<string, string>;
    };

/**
 * Villanın kategori bağlarını (villa_categories) formdan gelen listeye eşitler.
 * Villanın eski bağları silinir; seçilen her kategoriye villa, o kategorinin
 * sonuna eklenir (kategori içi sıra bozulmaz).
 */
async function syncVillaCategories(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  villaId: string,
  categoryIds: string[]
) {
  await supabase.from("villa_categories").delete().eq("villa_id", villaId);
  if (categoryIds.length === 0) return;

  const rows: { villa_id: string; category_id: string; sort_order: number }[] = [];
  for (const cid of categoryIds) {
    const { data: last } = await supabase
      .from("villa_categories")
      .select("sort_order")
      .eq("category_id", cid)
      .order("sort_order", { ascending: false })
      .limit(1);
    rows.push({
      villa_id: villaId,
      category_id: cid,
      sort_order: (last?.[0]?.sort_order ?? -1) + 1,
    });
  }
  await supabase.from("villa_categories").insert(rows);
  revalidatePath("/yonetim/kategoriler");
}

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
  const { id, updatedAt, categoryIds, ...fields } = parsed.data;

  const supabase = await supabaseSession();

  // Eşzamanlı düzenleme koruması (docs/panel-kurallari.md §3): form açıldıktan
  // sonra satır değiştiyse WHERE eşleşmez, kimse kimsenin işini sessizce ezmez.
  let query = supabase.from("villas").update(toVillaRow(fields)).eq("id", id);
  if (updatedAt) query = query.eq("updated_at", updatedAt);

  const { data: saved, error } = await query.select("id").maybeSingle();

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

  // Hata yok ama satır dönmediyse: kayıt ya silinmiş ya da araya başka bir
  // kaydetme girmiş. İkisinde de kullanıcıya söylemek gerekir.
  if (!saved) return { ok: false, error: "conflict" };

  await syncVillaCategories(supabase, id, categoryIds);
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

  await syncVillaCategories(supabase, data.id, parsed.data.categoryIds);
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

// ---- Villa Silme (3 Aşamalı Kontrol & Temizlik) ----

export type VillaDeleteStatus = {
  ok: boolean;
  name?: string;
  imageCount?: number;
  activeBookingsCount?: number;
  cancelledBookingsCount?: number;
  error?: string;
};

export async function getVillaDeleteStatus(villaId: string): Promise<VillaDeleteStatus> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();

  // Villa adı
  const { data: villa } = await supabase
    .from("villas")
    .select("name")
    .eq("id", villaId)
    .maybeSingle();

  if (!villa) return { ok: false, error: "not_found" };

  // Görsel sayısı
  const { count: imageCount } = await supabase
    .from("villa_images")
    .select("*", { count: "exact", head: true })
    .eq("villa_id", villaId);

  // Rezervasyon durumları
  const { data: bookings } = await supabase
    .from("booking_requests")
    .select("id, status")
    .eq("villa_id", villaId);

  const activeBookingsCount = (bookings || []).filter(
    (b) => b.status !== "cancelled"
  ).length;
  const cancelledBookingsCount = (bookings || []).filter(
    (b) => b.status === "cancelled"
  ).length;

  return {
    ok: true,
    name: villa.name,
    imageCount: imageCount ?? 0,
    activeBookingsCount,
    cancelledBookingsCount,
  };
}

export type DeleteVillaResult =
  | { ok: true }
  | {
      ok: false;
      error: "auth" | "not_found" | "has_active_bookings" | "generic";
      activeCount?: number;
    };

export async function deleteVillaCascade(
  villaId: string,
  options?: { cancelActiveBookings?: boolean }
): Promise<DeleteVillaResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();

  // 1. Villa var mı?
  const { data: villa } = await supabase
    .from("villas")
    .select("id, name")
    .eq("id", villaId)
    .maybeSingle();

  if (!villa) return { ok: false, error: "not_found" };

  // 2. Aktif rezervasyon kontrolü
  const { data: activeBookings } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("villa_id", villaId)
    .neq("status", "cancelled");

  if (activeBookings && activeBookings.length > 0) {
    if (!options?.cancelActiveBookings) {
      return {
        ok: false,
        error: "has_active_bookings",
        activeCount: activeBookings.length,
      };
    }

    // Kullanıcı onay verdi: Aktif rezervasyonları iptal edildi olarak güncelle
    await supabase
      .from("booking_requests")
      .update({
        status: "cancelled",
      })
      .eq("villa_id", villaId)
      .neq("status", "cancelled");
  }

  // 3. Rezervasyonların silinmeyip "İptal Edilenler" listesinde kalabilmesi için villa_id bağını null veya korumalı yap
  await supabase
    .from("booking_requests")
    .update({ villa_id: null })
    .eq("villa_id", villaId);

  // 4. Görselleri Storage ve DB'den temizle
  const { data: images } = await supabase
    .from("villa_images")
    .select("url")
    .eq("villa_id", villaId);

  if (images && images.length > 0) {
    // URL'den storage path'ini ayıkla (e.g. villalar/slug/filename.webp)
    const storagePaths: string[] = [];
    images.forEach((img) => {
      if (img.url) {
        const parts = img.url.split("/villa-images/");
        if (parts[1]) storagePaths.push(parts[1]);
      }
    });

    if (storagePaths.length > 0) {
      await supabase.storage.from("villa-images").remove(storagePaths);
    }

    await supabase.from("villa_images").delete().eq("villa_id", villaId);
  }

  // 5. Sezon ve Blok kayıtlarını temizle
  await supabase.from("villa_seasons").delete().eq("villa_id", villaId);
  await supabase.from("villa_blocks").delete().eq("villa_id", villaId);

  // 6. Villayı sil
  const { error: delErr } = await supabase
    .from("villas")
    .delete()
    .eq("id", villaId);

  if (delErr) {
    return { ok: false, error: "generic" };
  }

  revalidatePath("/yonetim/villalar");
  revalidatePath("/", "layout");

  return { ok: true };
}

