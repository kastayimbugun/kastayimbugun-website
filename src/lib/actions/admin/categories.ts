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

export type CategoryResult =
  | { ok: true; id?: string }
  | { ok: false; error: "auth" | "validation" | "slug" | "generic" };

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
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("categories")
    .insert(toRow(parsed.data))
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug" };
    return { ok: false, error: "generic" };
  }
  revalidate(data.id);
  return { ok: true, id: data.id };
}

export async function updateCategory(input: unknown): Promise<CategoryResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { id, ...fields } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("categories")
    .update(toRow(fields))
    .eq("id", id);
  if (error) {
    if (error.code === "23505") return { ok: false, error: "slug" };
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
