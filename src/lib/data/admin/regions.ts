import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { imageUrl } from "@/lib/images/url";

export interface RegionOption {
  id: string;
  name: string;
  province: string;
}

/** Villa formundaki bölge açılır listesi için. */
export async function getRegionOptions(): Promise<RegionOption[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("regions")
    .select("id, name, province")
    .order("sort_order");
  if (error) throw new Error(`Bölgeler okunamadı: ${error.message}`);
  return data;
}

export interface AdminRegion {
  id: string;
  slug: string;
  name: string;
  province: string;
  /** Önizleme için tam URL; görsel yoksa null. */
  heroImageUrl: string | null;
  sortOrder: number;
  villaCount: number;
}

/** Panel bölge listesi — villa sayılarıyla (silme kısıtı için). */
export async function getAdminRegions(): Promise<AdminRegion[]> {
  const supabase = await supabaseSession();
  const [{ data: regions, error }, { data: villas }] = await Promise.all([
    supabase
      .from("regions")
      .select("id, slug, name, province, hero_image, sort_order")
      .order("sort_order"),
    supabase.from("villas").select("region_id"),
  ]);
  if (error) throw new Error(`Bölgeler okunamadı: ${error.message}`);

  const counts = new Map<string, number>();
  for (const v of (villas ?? []) as { region_id: string | null }[]) {
    if (v.region_id)
      counts.set(v.region_id, (counts.get(v.region_id) ?? 0) + 1);
  }

  return (regions as Array<{
    id: string;
    slug: string;
    name: string;
    province: string;
    hero_image: string | null;
    sort_order: number;
  }>).map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    province: r.province,
    heroImageUrl: imageUrl(r.hero_image),
    sortOrder: r.sort_order,
    villaCount: counts.get(r.id) ?? 0,
  }));
}
