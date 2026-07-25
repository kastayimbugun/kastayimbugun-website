"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  seasonSchema,
  blockSchema,
  deleteChildSchema,
} from "@/lib/schemas/adminVilla";
import type { SupabaseClient } from "@supabase/supabase-js";

export type VillaChildResult =
  | { ok: true }
  | { ok: false; error: "auth" | "validation" | "conflict" | "generic" };

/** Villa slug'ını çekip hem panel detayını hem herkese açık villa sayfasını tazeler. */
async function revalidateVilla(
  supabase: SupabaseClient,
  villaId: string
) {
  const { data } = await supabase
    .from("villas")
    .select("slug")
    .eq("id", villaId)
    .maybeSingle();
  revalidatePath(`/yonetim/villalar/${villaId}`);
  if (data?.slug) revalidatePath(`/villa/${data.slug}`);
}

// ---- Sezon fiyatları ----

export async function addSeason(input: unknown): Promise<VillaChildResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = seasonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
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
  if (!parsed.success) return { ok: false, error: "validation" };
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
