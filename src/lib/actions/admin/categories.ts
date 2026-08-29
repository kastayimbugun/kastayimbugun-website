"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  categoryFormSchema,
  updateCategorySchema,
  deleteCategorySchema,
  setCategoryVillasSchema,
  type CategoryFormInput,
} from "@/lib/schemas/adminCategory";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";
import { storeImage, removeImage } from "@/lib/images/store";

export type CategoryResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: "auth" | "validation" | "slug" | "generic";
      fields?: Record<string, string>;
    };

export type CategoryImageResult =
  | { ok: true }
  | { ok: false; error: "auth" | "validation" | "toobig" | "type" | "generic" };

function toRow(d: CategoryFormInput) {
  return {
    name_tr: d.nameTr,
    name_en: d.nameEn,
    slug: d.slug,
    desc_tr: d.descTr,
    desc_en: d.descEn,
    color: d.color,
    icon: d.icon,
    image: d.image,
    featured_on_home: d.featuredOnHome,
    featured: d.featuredOnHome,
  };
}

function revalidate(id?: string) {
  revalidatePath("/yonetim/kategoriler");
  if (id) revalidatePath(`/yonetim/kategoriler/${id}`);
  revalidatePath("/", "layout"); // ana sayfa kategori blokları
}

export async function createCategory(input: unknown): Promise<CategoryResult> {
  const staff = await requirePermission("categories");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }

  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("categories")
    .insert(toRow(parsed.data))
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu kısa ad başka kategoride kullanılıyor." },
      };
    }
    return { ok: false, error: "generic" };
  }
  revalidate(data.id);
  return { ok: true, id: data.id };
}

export async function updateCategory(input: unknown): Promise<CategoryResult> {
  const staff = await requirePermission("categories");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const { id, ...fields } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("categories")
    .update(toRow(fields))
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu kısa ad başka kategoride kullanılıyor." },
      };
    }
    return { ok: false, error: "generic" };
  }
  revalidate(id);
  return { ok: true, id };
}

export async function deleteCategory(input: unknown): Promise<CategoryResult> {
  const staff = await requirePermission("categories");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = deleteCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "generic" };
  revalidate();
  return { ok: true };
}

/** Kategorideki villaları toptan ayarlar (villa_categories'i yeniden yazar). */
export async function setCategoryVillas(
  input: unknown
): Promise<CategoryResult> {
  const staff = await requirePermission("categories");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = setCategoryVillasSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { categoryId, villaIds } = parsed.data;

  const supabase = await supabaseSession();

  // Sil + yaz tek transaction (0022_atomic_operations.sql). İki ayrı istekte
  // silme geçip yazma düşerse kategori tamamen boşalıyordu ve geri alınamıyordu.
  const { error } = await supabase.rpc("set_category_villas", {
    p_category_id: categoryId,
    p_villa_ids: villaIds,
  });
  if (error) return { ok: false, error: "generic" };

  revalidate(categoryId);
  return { ok: true };
}

export async function saveCategoryHomeSettings(
  items: Array<{
    id: string;
    showInBrowser: boolean;
    featuredOnHome: boolean;
    sortOrder: number;
  }>
): Promise<CategoryResult> {
  const staff = await requirePermission("categories");
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();

  for (const item of items) {
    const base = {
      featured_on_home: item.featuredOnHome,
      featured: item.featuredOnHome,
      sort_order: item.sortOrder,
    };

    let { error } = await supabase
      .from("categories")
      .update({ ...base, show_in_browser: item.showInBrowser })
      .eq("id", item.id);

    // `show_in_browser` kolonu henüz veritabanına eklenmemişse (0011 migration'ı
    // uygulanmadan) tek satırda patlamak yerine o alan olmadan tekrar dene —
    // böylece görünürlük/sıra yine kaydolur ve sessiz "generic" hata olmaz.
    if (error && error.message?.includes("show_in_browser")) {
      ({ error } = await supabase
        .from("categories")
        .update(base)
        .eq("id", item.id));
    }

    if (error) {
      return { ok: false, error: "generic" };
    }
  }

  revalidatePath("/yonetim/ayarlar");
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Kategori görselini yükler ve DB'deki `image` alanını günceller. FormData: categoryId, file. */
export async function uploadCategoryImage(
  formData: FormData
): Promise<CategoryImageResult> {
  const staff = await requirePermission("categories");
  if (!staff) return { ok: false, error: "auth" };

  const categoryId = String(formData.get("categoryId") ?? "");
  if (!categoryId) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { data: cat } = await supabase
    .from("categories")
    .select("slug, image")
    .eq("id", categoryId)
    .maybeSingle();
  if (!cat) return { ok: false, error: "validation" };

  const stored = await storeImage(
    supabase,
    formData.get("file"),
    `kategoriler/${cat.slug}`
  );
  if (!stored.ok) return stored;

  const { error } = await supabase
    .from("categories")
    .update({ image: stored.path })
    .eq("id", categoryId);
  if (error) {
    await removeImage(supabase, stored.path);
    return { ok: false, error: "generic" };
  }

  // Eski görseli Storage'dan temizle (URL değilse)
  await removeImage(supabase, cat.image);
  revalidate(categoryId);
  return { ok: true };
}

/** Kategori görselini kaldırır (Storage + DB). */
export async function removeCategoryImage(
  input: unknown
): Promise<CategoryImageResult> {
  const staff = await requirePermission("categories");
  if (!staff) return { ok: false, error: "auth" };

  const categoryId = String((input as Record<string, unknown>)?.categoryId ?? "");
  if (!categoryId) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { data: cat } = await supabase
    .from("categories")
    .select("image")
    .eq("id", categoryId)
    .maybeSingle();
  if (!cat) return { ok: false, error: "validation" };

  const { error } = await supabase
    .from("categories")
    .update({ image: null })
    .eq("id", categoryId);
  if (error) return { ok: false, error: "generic" };

  await removeImage(supabase, cat.image);
  revalidate(categoryId);
  return { ok: true };
}
