import { cache } from "react";
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
 * Alt bilgi (Footer) menüsünde gösterilecek yayınlanmış sayfalar.
 *
 * Yalnızca bağlantı için gereken üç sütun çekilir. `select("*")` zamanı
 * `content_tr`/`content_en` (tam HTML gövdeler) da geliyordu ve Footer her
 * sayfada render edildiği için, footer'a bir "Kiralama Koşulları" sayfası
 * eklendiği an o yasal metnin tamamı **sitedeki her sayfanın** RSC payload'ına
 * giriyordu. Bugün hiçbir sayfa footer'da işaretli olmadığı için sorun
 * görünmüyordu — bekleyen bir payload bombasıydı.
 */
/** Footer bağlantısı için gereken minimum alanlar. */
export interface FooterPageLink {
  slug: string;
  titleTr: string;
  titleEn: string;
}

export const getFooterPages = cache(async (): Promise<FooterPageLink[]> => {
  const { data, error } = await supabaseServer()
    .from("pages")
    .select("slug, title_tr, title_en")
    .eq("status", "published")
    .eq("show_in_footer", true)
    .order("sort_order", { ascending: true })
    .order("title_tr", { ascending: true });

  if (error || !data) return [];
  return data.map((r) => ({
    slug: r.slug as string,
    titleTr: r.title_tr as string,
    titleEn: r.title_en as string,
  }));
})

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
