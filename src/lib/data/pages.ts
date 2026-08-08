import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { CustomPage } from "@/lib/types";

export function mapPage(row: Record<string, any>): CustomPage {
  return {
    id: row.id,
    slug: row.slug,
    titleTr: row.title_tr,
    titleEn: row.title_en,
    contentTr: row.content_tr || "",
    contentEn: row.content_en || "",
    metaTitleTr: row.meta_title_tr,
    metaTitleEn: row.meta_title_en,
    metaDescriptionTr: row.meta_description_tr,
    metaDescriptionEn: row.meta_description_en,
    status: row.status as "draft" | "published",
    showInFooter: Boolean(row.show_in_footer),
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Yayınlanmış dinamik sayfayı slug'a göre getirir.
 */
export async function getPageBySlug(slug: string): Promise<CustomPage | null> {
  const { data, error } = await supabaseServer()
    .from("pages")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (error || !data) return null;
  return mapPage(data);
}

/**
 * Alt bilgi (Footer) menüsünde gösterilecek yayınlanmış sayfaları getirir.
 */
export async function getFooterPages(): Promise<CustomPage[]> {
  const { data, error } = await supabaseServer()
    .from("pages")
    .select("*")
    .eq("status", "published")
    .eq("show_in_footer", true)
    .order("sort_order", { ascending: true })
    .order("title_tr", { ascending: true });

  if (error || !data) return [];
  return data.map(mapPage);
}

/**
 * Statik sayfa üretimi için tüm yayınlanmış slug'ları getirir.
 */
export async function getAllPublishedPageSlugs(): Promise<string[]> {
  const { data, error } = await supabaseServer()
    .from("pages")
    .select("slug")
    .eq("status", "published");

  if (error || !data) return [];
  return data.map((row) => row.slug);
}
