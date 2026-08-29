"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/staff";
import { can } from "@/lib/auth/permissions";
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
    pool_width: d.poolWidth,
    pool_length: d.poolLength,
    pool_depth: d.poolDepth,
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
    damage_deposit: d.damageDeposit,
    ministry_cert_no: d.ministryCertNo,
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

/** 0019 kolonları henüz uygulanmadıysa satırdan bunları çıkarır (fallback). */
function stripExtraVillaCols<T extends Record<string, unknown>>(row: T) {
  const {
    pool_width: _pw,
    pool_length: _pl,
    pool_depth: _pd,
    damage_deposit: _dd,
    ministry_cert_no: _mc,
    ...rest
  } = row;
  void [_pw, _pl, _pd, _dd, _mc];
  return rest;
}

/** 0019 kolonları eksik mi (migration uygulanmamış)? */
const isMissingVillaExtraCols = (message: string | undefined) =>
  /pool_width|pool_length|pool_depth|damage_deposit|ministry_cert_no/.test(
    message ?? ""
  );

export type VillaSaveResult =
  | {
      ok: true;
      id: string;
      /**
       * İşlem başarılı ama bir yan adım tutmadı (ör. villa oluştu, kategori
       * bağları yazılamadı). Formu hata durumuna düşürmek yanlış olur — kayıt
       * gerçekten var — ama sessiz geçmek de yanlış; form bunu uyarı olarak gösterir.
       */
      warning?: string;
    }
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
): Promise<boolean> {
  // Sil + yaz tek transaction (0022_atomic_operations.sql). Eskiden üç ayrı istek
  // vardı ve hiçbirinin hatası kontrol edilmiyordu: silme geçip yazma düşerse villa
  // hiçbir kategoride görünmüyor, panel ise "Kaydedildi." diyordu. Sıra hesabı da
  // kategori başına ayrı sorgu yerine tek sorguda yapılıyor (N+1 kalktı).
  const { error } = await supabase.rpc("sync_villa_categories", {
    p_villa_id: villaId,
    p_category_ids: categoryIds,
  });
  if (error) return false;

  revalidatePath("/yonetim/kategoriler");
  return true;
}

export async function updateVilla(input: unknown): Promise<VillaSaveResult> {
  const staff = await requirePermission("villas");
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
  const runUpdate = (row: Record<string, unknown>) => {
    let query = supabase.from("villas").update(row).eq("id", id);
    if (updatedAt) query = query.eq("updated_at", updatedAt);
    return query.select("id").maybeSingle();
  };

  const villaRow = toVillaRow(fields);
  let { data: saved, error } = await runUpdate(villaRow);
  // 0019 kolonları yoksa bu alanlar olmadan tekrar dene.
  if (error && isMissingVillaExtraCols(error.message)) {
    ({ data: saved, error } = await runUpdate(stripExtraVillaCols(villaRow)));
  }

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

  if (!(await syncVillaCategories(supabase, id, categoryIds))) {
    return { ok: false, error: "generic" };
  }
  await revalidateVilla(supabase, id);
  return { ok: true, id };
}

export async function createVilla(input: unknown): Promise<VillaSaveResult> {
  const staff = await requirePermission("villas");
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
  const villaRow = toVillaRow(parsed.data);
  let { data, error } = await supabase
    .from("villas")
    .insert(villaRow)
    .select("id")
    .single();

  // 0019 kolonları yoksa bu alanlar olmadan tekrar dene.
  if (error && isMissingVillaExtraCols(error.message)) {
    ({ data, error } = await supabase
      .from("villas")
      .insert(stripExtraVillaCols(villaRow))
      .select("id")
      .single());
  }

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

  // Villa satırı oluştu. Kategori bağları yazılamazsa işlemi "başarısız" sayma:
  // kullanıcı tekrar denerse slug çakışması alır. Villayı bildir, eksiği söyle.
  const catOk = await syncVillaCategories(supabase, data.id, parsed.data.categoryIds);
  revalidatePath("/yonetim/villalar");
  revalidatePath("/", "layout");
  return catOk
    ? { ok: true, id: data.id }
    : {
        ok: true,
        id: data.id,
        warning:
          "Villa oluşturuldu ancak kategori bağları kaydedilemedi. Kategoriler sekmesinden tekrar seçin.",
      };
}

// ---- Sezon fiyatları ----

export async function addSeason(input: unknown): Promise<VillaChildResult> {
  const staff = await requirePermission("villas");
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
  const staff = await requirePermission("villas");
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
  const staff = await requirePermission("villas");
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
  const staff = await requirePermission("villas");
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
  const staff = await requirePermission("villas");
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
  const staff = await requirePermission("villas");
  if (!staff) return { ok: false, error: "auth" };
  if (!z.uuid().safeParse(villaId).success) {
    return { ok: false, error: "not_found" };
  }

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
  // Hata halinde 0 gösterme: silme modalı "aktif rezervasyon yok" derse kullanıcı
  // yanlış bilgiyle onaylar. Sayı okunamıyorsa işlemi hiç başlatma.
  const { data: bookings, error: bookErr } = await supabase
    .from("booking_requests")
    .select("id, status")
    .eq("villa_id", villaId);

  if (bookErr) return { ok: false, error: "generic" };

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
  const staff = await requirePermission("villas");
  if (!staff) return { ok: false, error: "auth" };

  // Bu fonksiyon `booking_requests` satırlarını iptale çevirip `villa_id` bağını
  // koparıyor — yani REZERVASYON verisine dokunuyor. Yalnızca `villas` izniyle
  // yapılabilmesi modül izin modelini deliyordu; RLS bilerek modül-bazlı
  // olmadığı için durduracak ikinci bir savunma da yok (panel-kurallari.md §1).
  if (options?.cancelActiveBookings && !can(staff, "reservations")) {
    return { ok: false, error: "auth" };
  }

  // İstemciden gelen id doğrulanmadan sorgulara giriyordu (ARCHITECTURE.md §3).
  if (!z.uuid().safeParse(villaId).success) {
    return { ok: false, error: "not_found" };
  }

  const supabase = await supabaseSession();

  // 1. Villa var mı?
  const { data: villa } = await supabase
    .from("villas")
    .select("id, name")
    .eq("id", villaId)
    .maybeSingle();

  if (!villa) return { ok: false, error: "not_found" };

  // 2. Aktif rezervasyon kontrolü
  // Sorgu hata verirse "rezervasyon yok" varsayma — fail-closed davran. Aksi halde
  // null'a düşen sonuç guard'ı atlar ve onaylı rezervasyonu olan villa sessizce silinir.
  const { data: activeBookings, error: activeErr } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("villa_id", villaId)
    .neq("status", "cancelled");

  if (activeErr) return { ok: false, error: "generic" };

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
  // `villa_images` tablosunda `url` diye bir sütun YOK, `storage_path` var
  // (0001_init.sql). Eskiden `.select("url")` çağrılıyordu: PostgREST hata
  // döndürüyor, hata okunmadığı için `images` null kalıyor ve bu blok tümüyle
  // atlanıyordu — silinen her villanın fotoğrafları Storage'da yetim kalıyordu.
  // Desen `deleteImages` (actions/admin/images.ts) ile aynı: yollar DB'den okunur.
  const { data: images, error: imgErr } = await supabase
    .from("villa_images")
    .select("storage_path")
    .eq("villa_id", villaId);

  if (imgErr) return { ok: false, error: "generic" };

  if (images && images.length > 0) {
    const storagePaths = images
      .map((img) => img.storage_path as string)
      .filter((p) => p && !p.startsWith("http"));

    if (storagePaths.length > 0) {
      // Dosyaları önce sil: DB satırı gidince yola bir daha ulaşılamaz.
      const { error: rmErr } = await supabase.storage
        .from("villa-images")
        .remove(storagePaths);
      if (rmErr) return { ok: false, error: "generic" };
    }

    const { error: delImgErr } = await supabase
      .from("villa_images")
      .delete()
      .eq("villa_id", villaId);
    if (delImgErr) return { ok: false, error: "generic" };
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

