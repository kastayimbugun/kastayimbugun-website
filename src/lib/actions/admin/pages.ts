"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import { pageSchema, PageSchemaInput } from "@/lib/schemas/pages";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";

export type PageActionResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: "auth" | "validation" | "slug" | "generic";
      fields?: Record<string, string>;
    };

function revalidate() {
  revalidatePath("/yonetim/sayfalar");
  revalidatePath("/", "layout");
  revalidatePath("/sayfa/[slug]", "page");
}

function toRow(data: PageSchemaInput) {
  return {
    slug: data.slug,
    title_tr: data.titleTr,
    title_en: data.titleEn,
    content_tr: data.contentTr || "",
    content_en: data.contentEn || "",
    meta_title_tr: data.metaTitleTr || null,
    meta_title_en: data.metaTitleEn || null,
    meta_description_tr: data.metaDescriptionTr || null,
    meta_description_en: data.metaDescriptionEn || null,
    status: data.status,
    show_in_footer: data.showInFooter,
    sort_order: data.sortOrder,
  };
}

export async function createPageAction(input: unknown): Promise<PageActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }

  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("pages")
    .insert(toRow(parsed.data))
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu URL uzantısı (slug) başka bir sayfada kullanılıyor." },
      };
    }
    return { ok: false, error: "generic" };
  }

  revalidate();
  return { ok: true, id: data.id };
}

export async function updatePageAction(id: string, input: unknown): Promise<PageActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = pageSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("pages")
    .update(toRow(parsed.data))
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu URL uzantısı (slug) başka bir sayfada kullanılıyor." },
      };
    }
    return { ok: false, error: "generic" };
  }

  revalidate();
  return { ok: true, id };
}

export async function deletePageAction(id: string): Promise<PageActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();
  const { error } = await supabase.from("pages").delete().eq("id", id);

  if (error) return { ok: false, error: "generic" };

  revalidate();
  return { ok: true };
}

export async function togglePageStatusAction(
  id: string,
  newStatus: "draft" | "published"
): Promise<PageActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("pages")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return { ok: false, error: "generic" };

  revalidate();
  return { ok: true, id };
}
