"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  regionFormSchema,
  updateRegionSchema,
  deleteRegionSchema,
  type RegionFormInput,
} from "@/lib/schemas/adminRegion";

export type RegionResult =
  | { ok: true; id?: string }
  | { ok: false; error: "auth" | "validation" | "slug" | "inuse" | "generic" };

function toRow(d: RegionFormInput) {
  return {
    name: d.name,
    province: d.province,
    slug: d.slug,
    hero_image: d.heroImage,
    sort_order: d.sortOrder,
  };
}

function revalidate() {
  revalidatePath("/yonetim/bolgeler");
  revalidatePath("/", "layout"); // footer + site bölge listeleri
}

export async function createRegion(input: unknown): Promise<RegionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = regionFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("regions")
    .insert(toRow(parsed.data))
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug" };
    return { ok: false, error: "generic" };
  }
  revalidate();
  return { ok: true, id: data.id };
}

export async function updateRegion(input: unknown): Promise<RegionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateRegionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { id, ...fields } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("regions")
    .update(toRow(fields))
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug" };
    return { ok: false, error: "generic" };
  }
  revalidate();
  return { ok: true, id };
}

export async function deleteRegion(input: unknown): Promise<RegionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = deleteRegionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("regions")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    // 23503 = foreign_key_violation (bölgeye bağlı villa var)
    if (error.code === "23503") return { ok: false, error: "inuse" };
    return { ok: false, error: "generic" };
  }
  revalidate();
  return { ok: true };
}
