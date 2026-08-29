"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/staff";
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

async function toRow(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  d: RegionFormInput,
  isNew = false
) {
  let depth = 0;
  let province = d.province;

  if (d.parentId) {
    const { data: parent } = await supabase
      .from("regions")
      .select("name, depth")
      .eq("id", d.parentId)
      .maybeSingle();

    if (parent) {
      depth = (parent.depth ?? 0) + 1;
      province = parent.name;
    }
  }

  // Yeni bölge eklenirken sıralamayı otomatik hesapla:
  // Aynı parent altındaki en yüksek sort_order'ın bir fazlası.
  let sortOrder = d.sortOrder;
  if (isNew) {
    const query = d.parentId
      ? supabase.from("regions").select("sort_order").eq("parent_id", d.parentId)
      : supabase.from("regions").select("sort_order").is("parent_id", null);

    const { data: siblings } = await query.order("sort_order", { ascending: false }).limit(1);
    if (siblings && siblings.length > 0) {
      sortOrder = (siblings[0].sort_order ?? 0) + 1;
    } else {
      sortOrder = 0;
    }
  }

  return {
    name: d.name,
    province: province,
    slug: d.slug,
    sort_order: sortOrder,
    parent_id: d.parentId || null,
    depth: depth,
  };
}


function revalidate() {
  revalidatePath("/yonetim/bolgeler");
  revalidatePath("/", "layout"); // footer + site bölge listeleri
}

export async function createRegion(input: unknown): Promise<RegionResult> {
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = regionFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }

  const supabase = await supabaseSession();
  const rowData = await toRow(supabase, parsed.data, true); // isNew=true: sort_order otomatik atanır
  const { data, error } = await supabase
    .from("regions")
    .insert(rowData)
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
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateRegionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const { id, ...fields } = parsed.data;

  const supabase = await supabaseSession();
  const rowData = await toRow(supabase, fields);
  const { error } = await supabase
    .from("regions")
    .update(rowData)
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
  const staff = await requirePermission("regions");
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
  const staff = await requirePermission("regions");
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

export async function updateRegionsTreeOrder(
  items: { id: string; parentId: string | null; depth: number; sortOrder: number }[]
): Promise<RegionResult> {
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  if (!Array.isArray(items) || items.length === 0) {
    return { ok: true };
  }

  const supabase = await supabaseSession();

  // Toplu güncelleme: parent_id, depth ve sort_order
  for (const item of items) {
    const { error } = await supabase
      .from("regions")
      .update({
        parent_id: item.parentId,
        depth: item.depth,
        sort_order: item.sortOrder,
      })
      .eq("id", item.id);

    if (error) {
      return { ok: false, error: "generic" };
    }
  }

  revalidate();
  return { ok: true };
}

export async function deleteRegion(input: unknown): Promise<RegionResult> {
  const staff = await requirePermission("regions");
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
