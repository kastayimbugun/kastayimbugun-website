import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { imageUrl } from "@/lib/images/url";

export interface RegionOption {
  id: string;
  name: string;
  province: string;
  parentId: string | null;
  depth: number;
}

/** Villa formundaki bölge açılır listesi için. */
export async function getRegionOptions(): Promise<RegionOption[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("regions")
    .select("id, name, province, parent_id, depth")
    .order("sort_order");
  if (error) {
    if (error.message.includes("parent_id")) {
      const { data: fbData } = await supabase
        .from("regions")
        .select("id, name, province")
        .order("sort_order");
      return (fbData ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        province: r.province,
        parentId: null,
        depth: 0,
      }));
    }
    throw new Error(`Bölgeler okunamadı: ${error.message}`);
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    province: r.province,
    parentId: r.parent_id ?? null,
    depth: r.depth ?? 0,
  }));
}

export interface AdminRegion {
  id: string;
  slug: string;
  name: string;
  province: string;
  heroImageUrl: string | null;
  sortOrder: number;
  villaCount: number;
  parentId: string | null;
  depth: number;
}

export type AdminDistrictNode = AdminRegion & {
  neighborhoods: AdminRegion[];
};

export type AdminCityNode = AdminRegion & {
  districts: AdminDistrictNode[];
};

export interface AdminRegionTree3Level {
  cities: AdminCityNode[];
  orphans: AdminRegion[];
}

/** Tek bölge — düzenleme sayfası için. */
export async function getAdminRegion(id: string): Promise<AdminRegion | null> {
  const supabase = await supabaseSession();

  let data: any = null;
  let error: any = null;

  const res = await supabase
    .from("regions")
    .select("id, slug, name, province, hero_image, sort_order, parent_id, depth")
    .eq("id", id)
    .maybeSingle();

  data = res.data;
  error = res.error;

  if (error && error.message.includes("parent_id")) {
    const fallbackRes = await supabase
      .from("regions")
      .select("id, slug, name, province, hero_image, sort_order")
      .eq("id", id)
      .maybeSingle();
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  const { count, error: countError } = await supabase
    .from("villas")
    .select("id", { count: "exact", head: true })
    .eq("region_id", id);

  if (error) throw new Error(`Bölge okunamadı: ${error.message}`);
  if (countError)
    throw new Error(`Bölge villa sayısı okunamadı: ${countError.message}`);
  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    province: data.province,
    heroImageUrl: imageUrl(data.hero_image),
    sortOrder: data.sort_order,
    villaCount: count ?? 0,
    parentId: data.parent_id ?? null,
    depth: data.depth ?? 0,
  };
}

/** Panel bölge listesi — ham dizi. */
export async function getAdminRegions(): Promise<AdminRegion[]> {
  const supabase = await supabaseSession();
  let regions: Array<{
    id: string;
    slug: string;
    name: string;
    province: string;
    hero_image: string | null;
    sort_order: number;
    parent_id?: string | null;
    depth?: number;
  }> | null = null;
  let error: any = null;

  const res = await supabase
    .from("regions")
    .select("id, slug, name, province, hero_image, sort_order, parent_id, depth")
    .order("sort_order");

  regions = res.data;
  error = res.error;

  if (error && error.message.includes("parent_id")) {
    const fb = await supabase
      .from("regions")
      .select("id, slug, name, province, hero_image, sort_order")
      .order("sort_order");
    regions = fb.data;
    error = fb.error;
  }

  if (error) throw new Error(`Bölgeler okunamadı: ${error.message}`);

  const rows = regions ?? [];

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
    parentId: r.parent_id ?? null,
    depth: r.depth ?? 0,
  }));
}

/** 3 Seviyeli Ağaç yapısına dönüştür: İl (0) → İlçe (1) → Bölge/Belde (2). */
export async function getAdminRegionTree(): Promise<AdminRegionTree3Level> {
  const all = await getAdminRegions();

  const regionMap = new Map<string, AdminRegion>();
  all.forEach((r) => regionMap.set(r.id, r));

  const childMap = new Map<string, AdminRegion[]>();
  all.forEach((r) => {
    if (r.parentId) {
      const list = childMap.get(r.parentId) ?? [];
      list.push(r);
      childMap.set(r.parentId, list);
    }
  });

  const cities: AdminCityNode[] = [];
  const orphans: AdminRegion[] = [];

  all.forEach((r) => {
    if (!r.parentId) {
      const children = childMap.get(r.id) ?? [];
      // Çocukları varsa veya depth=0 ise Şehirdir
      if (children.length > 0 || r.depth === 0) {
        const districts: AdminDistrictNode[] = children.map((district) => ({
          ...district,
          neighborhoods: childMap.get(district.id) ?? [],
        }));

        cities.push({
          ...r,
          districts,
        });
      } else {
        // Çocuğu da yok, parent'ı da yok (eski veri)
        if (r.villaCount > 0) {
          orphans.push(r);
        } else {
          cities.push({ ...r, districts: [] });
        }
      }
    }
  });

  return { cities, orphans };
}

/** Formlarda "Üst Bölge" seçebilmek için İl ve İlçe opsiyonları getirir. */
export async function getRegionParentOptions(): Promise<{ id: string; label: string; depth: number }[]> {
  const all = await getAdminRegions();
  const map = new Map(all.map((r) => [r.id, r]));

  // Sadece depth 0 (İl) veya depth 1 (İlçe) olanlar üst bölge seçilebilir.
  const parentable = all.filter((r) => r.depth < 2);

  return parentable.map((r) => {
    let label = r.name;
    if (r.depth === 0) {
      label = `${r.name} (İl)`;
    } else if (r.depth === 1) {
      const parent = r.parentId ? map.get(r.parentId) : null;
      label = parent ? `${parent.name} > ${r.name} (İlçe)` : `${r.name} (İlçe)`;
    }

    return {
      id: r.id,
      label,
      depth: r.depth,
    };
  });
}
