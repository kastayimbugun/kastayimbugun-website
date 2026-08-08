"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  bulkSeasonSchema,
  bulkAvailabilitySchema,
} from "@/lib/schemas/adminBulk";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";

export type BulkResult =
  | { ok: true; applied: number; skipped: number }
  | {
      ok: false;
      error: "auth" | "validation" | "generic";
      fields?: Record<string, string>;
    };

/**
 * Seçili villalara aynı tarih aralığı için sezon fiyatı yazar.
 *
 * Öngörülebilirlik için: bir villada aralığa **değen** mevcut sezonlar önce
 * silinir, sonra tek bir sezon eklenir. Yani "1–31 Ağustos'a X fiyat" komutu
 * o villalarda o tarihteki eski fiyatı kesin olarak değiştirir (bulk edit
 * araçlarının standart davranışı). Aralık dışına taşan sezonlar da silinir —
 * kısmi kesişim belirsizliğe yol açmasın; panel bunu açıkça uyarır.
 */
export async function bulkSetSeason(input: unknown): Promise<BulkResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = bulkSeasonSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;
  const supabase = await supabaseSession();

  // Aralığa değen sezonları temizle: starts_on < to AND ends_on > from
  const { error: delErr } = await supabase
    .from("villa_seasons")
    .delete()
    .in("villa_id", d.villaIds)
    .lt("starts_on", d.to)
    .gt("ends_on", d.from);
  if (delErr) return { ok: false, error: "generic" };

  const rows = d.villaIds.map((villaId) => ({
    villa_id: villaId,
    label_tr: d.label,
    label_en: d.label,
    starts_on: d.from,
    ends_on: d.to,
    price: d.price,
    min_nights: d.minNights,
  }));

  const { error: insErr } = await supabase.from("villa_seasons").insert(rows);
  if (insErr) return { ok: false, error: "generic" };

  revalidatePath("/yonetim/takvim");
  for (const id of d.villaIds) revalidatePath(`/yonetim/villalar/${id}`);
  // Villa verisini gösteren tüm herkese açık sayfalar (ana sayfa, liste, detay).
  revalidatePath("/", "layout");

  return { ok: true, applied: d.villaIds.length, skipped: 0 };
}

/**
 * Seçili villalarda aynı aralığı toplu kapatır veya açar.
 *
 * Kapatma: her villaya elle blok eklenir; tarihi zaten dolu/kapalı olan villa
 * çakışma verir ve **atlanır** (sayısı sonuçta bildirilir) — biri yüzünden
 * tümü durmasın. Açma: yalnızca elle bloklar kaldırılır; onaylı rezervasyon
 * blokları korunur (Talepler ekranından yönetilir).
 */
export async function bulkSetAvailability(
  input: unknown
): Promise<BulkResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = bulkAvailabilitySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;
  const supabase = await supabaseSession();

  if (d.mode === "open") {
    const { error } = await supabase
      .from("villa_blocks")
      .delete()
      .in("villa_id", d.villaIds)
      .eq("source", "manual")
      .lt("starts_on", d.to)
      .gt("ends_on", d.from);
    if (error) return { ok: false, error: "generic" };

    revalidatePath("/yonetim/takvim");
    for (const id of d.villaIds) revalidatePath(`/yonetim/villalar/${id}`);
    revalidatePath("/", "layout");
    return { ok: true, applied: d.villaIds.length, skipped: 0 };
  }

  // Kapatma: villa başına dene, çakışanı atla.
  let applied = 0;
  let skipped = 0;
  for (const villaId of d.villaIds) {
    const { error } = await supabase.from("villa_blocks").insert({
      villa_id: villaId,
      starts_on: d.from,
      ends_on: d.to,
      source: "manual",
      note: d.note || null,
    });
    if (error) {
      // 23P01 = exclusion_violation (aralık zaten dolu/kapalı)
      if (error.code === "23P01") skipped++;
      else return { ok: false, error: "generic" };
    } else {
      applied++;
    }
  }

  revalidatePath("/yonetim/takvim");
  for (const id of d.villaIds) revalidatePath(`/yonetim/villalar/${id}`);
  // Villa verisini gösteren tüm herkese açık sayfalar (ana sayfa, liste, detay).
  revalidatePath("/", "layout");
  return { ok: true, applied, skipped };
}
