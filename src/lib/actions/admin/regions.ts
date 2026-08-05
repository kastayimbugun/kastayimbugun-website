"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  regionFormSchema,
  updateRegionSchema,
  deleteRegionSchema,
  regionIdSchema,
  type RegionFormInput,
} from "@/lib/schemas/adminRegion";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";
import { storeImage, removeImage } from "@/lib/images/store";

export type RegionResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: "auth" | "validation" | "slug" | "inuse" | "generic";
      fields?: Record<string, string>;
    };

export type RegionImageResult =
  | { ok: true }
  | { ok: false; error: "auth" | "validation" | "toobig" | "type" | "generic" };

function toRow(d: RegionFormInput) {
  return {
    name: d.name,
    province: d.province,
    slug: d.slug,
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
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }

  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("regions")
    .insert(toRow(parsed.data))
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu kısa ad başka bölgede kullanılıyor." },
      };
    }
    return { ok: false, error: "generic" };
  }
  revalidate();
  return { ok: true, id: data.id };
}

export async function updateRegion(input: unknown): Promise<RegionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateRegionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const { id, ...fields } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("regions")
    .update(toRow(fields))
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu kısa ad başka bölgede kullanılıyor." },
      };
    }
    return { ok: false, error: "generic" };
  }
  revalidate();
  return { ok: true, id };
}

/** Bölgenin mevcut kart görselinin Storage yolu (eskisini silmek için). */
async function currentHero(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  id: string
) {
  const { data } = await supabase
    .from("regions")
    .select("slug, hero_image")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/** Bölge kartı görselini yükler. FormData: regionId, file. */
export async function uploadRegionHero(
  formData: FormData
): Promise<RegionImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = regionIdSchema.safeParse({ id: formData.get("regionId") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const region = await currentHero(supabase, parsed.data.id);
  if (!region) return { ok: false, error: "validation" };

  const stored = await storeImage(
    supabase,
    formData.get("file"),
    `bolgeler/${region.slug}`
  );
  if (!stored.ok) return stored;

  const { error } = await supabase
    .from("regions")
    .update({ hero_image: stored.path })
    .eq("id", parsed.data.id);
  if (error) {
    await removeImage(supabase, stored.path); // kayıt olmadıysa dosyayı bırakma
    return { ok: false, error: "generic" };
  }

  await removeImage(supabase, region.hero_image);
  revalidate();
  return { ok: true };
}

export async function removeRegionHero(
  input: unknown
): Promise<RegionImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = regionIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const region = await currentHero(supabase, parsed.data.id);

  const { error } = await supabase
    .from("regions")
    .update({ hero_image: null })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "generic" };

  await removeImage(supabase, region?.hero_image);
  revalidate();
  return { ok: true };
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
