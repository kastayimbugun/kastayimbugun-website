"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  categoryFormSchema,
  updateCategorySchema,
  deleteCategorySchema,
  setCategoryVillasSchema,
  type CategoryFormInput,
} from "@/lib/schemas/adminCategory";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";

export type CategoryResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: "auth" | "validation" | "slug" | "generic";
      fields?: Record<string, string>;
    };

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
  const staff = await getStaffUser();
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
  const staff = await getStaffUser();
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
  const staff = await getStaffUser();
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
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = setCategoryVillasSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { categoryId, villaIds } = parsed.data;

  const supabase = await supabaseSession();
  const { error: delErr } = await supabase
    .from("villa_categories")
    .delete()
    .eq("category_id", categoryId);
  if (delErr) return { ok: false, error: "generic" };

  if (villaIds.length > 0) {
    const rows = villaIds.map((villaId, i) => ({
      category_id: categoryId,
      villa_id: villaId,
      sort_order: i,
    }));
    const { error: insErr } = await supabase
      .from("villa_categories")
      .insert(rows);
    if (insErr) return { ok: false, error: "generic" };
  }

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
  const staff = await getStaffUser();
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
