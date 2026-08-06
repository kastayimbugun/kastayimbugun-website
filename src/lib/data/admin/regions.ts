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
  const { data: regions, error } = await supabase
    .from("regions")
    .select("id, slug, name, province, hero_image, sort_order")
    .order("sort_order");
  if (error) throw new Error(`Bölgeler okunamadı: ${error.message}`);

  const rows = (regions ?? []) as Array<{
    id: string;
    slug: string;
    name: string;
    province: string;
    hero_image: string | null;
    sort_order: number;
  }>;

  // Villa sayısı bölge başına `count:"exact", head:true` ile alınır: satır
  // gövdesi hiç taşınmaz. Önceki sürüm tüm villas tablosunu çekip JS'te
  // sayıyordu — PostgREST'in satır sınırına (Supabase'de tipik 1000)
  // dayandığında sayı sessizce yanlışlanırdı ve silme kısıtı buna bakıyor.
  // Bölge sayısı doğası gereği küçük olduğu için sorgular paralel atılır.
  const counts = await Promise.all(
    rows.map(async (r) => {
      const { count, error: countError } = await supabase
        .from("villas")
        .select("id", { count: "exact", head: true })
        .eq("region_id", r.id);
      if (countError)
        throw new Error(`Bölge villa sayısı okunamadı: ${countError.message}`);
      return count ?? 0;
    })
  );

  return rows.map((r, i) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    province: r.province,
    heroImageUrl: imageUrl(r.hero_image),
    sortOrder: r.sort_order,
    villaCount: counts[i],
  }));
}
