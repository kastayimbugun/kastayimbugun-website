import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { imageUrl } from "@/lib/images/url";
import {
  MAX_REGION_DEPTH,
  buildRegionTree,
  flattenRegionTree,
  regionAncestors,
  regionDepthOf,
  regionLevelLabel,
  regionSubtreeIds,
  type RegionTreeNode,
} from "@/lib/regionTree";

/**
 * DİKKAT — `regions.depth` sütunu bu dosyada HİÇ okunmaz.
 *
 * Sütun türetilmiş bir önbellektir ve bozulabilir: panel arayüzü uzun süre
 * derinliği 3'te kırptığı için 25 kaydın 7'sinde yanlış değer duruyordu
 * (hepsinde 3 yazıyor, gerçek zincir 4-6). Tek doğru kaynak `parent_id`
 * zinciridir. Böylece bu kod, düzeltme migration'ı henüz uygulanmamış bir
 * veritabanında da doğru çalışır.
 */

export interface RegionOption {
  id: string;
  name: string;
  province: string;
  parentId: string | null;
  /** `parent_id` zincirinden HESAPLANMIŞ derinlik (kök = 0). */
  depth: number;
}

/** Villa formundaki bölge açılır listesi için. */
export async function getRegionOptions(): Promise<RegionOption[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("regions")
    .select("id, name, province, parent_id")
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

  const rows = data ?? [];
  const parentOf = new Map<string, string | null>(
    rows.map((r) => [r.id, r.parent_id ?? null])
  );

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    province: r.province,
    parentId: r.parent_id ?? null,
    depth: regionDepthOf(r.id, parentOf),
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
}

/** Kaç seviye olursa olsun aynı tip — sabit "şehir/ilçe/mahalle" katmanı yok. */
export type AdminRegionNode = RegionTreeNode<AdminRegion>;

export interface AdminRegionTree {
  roots: AdminRegionNode[];
  /** Üst bölgesi bulunamayan kayıtlar; yine de panelde gösterilir. */
  orphans: AdminRegion[];
}

/** Tek bölge — düzenleme sayfası için. */
export async function getAdminRegion(id: string): Promise<AdminRegion | null> {
  const supabase = await supabaseSession();

  let data: {
    id: string;
    slug: string;
    name: string;
    province: string;
    hero_image: string | null;
    sort_order: number;
    parent_id?: string | null;
  } | null = null;
  let error: { message: string } | null = null;

  const res = await supabase
    .from("regions")
    .select("id, slug, name, province, hero_image, sort_order, parent_id")
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
  }> | null = null;
  let error: { message: string } | null = null;

  const res = await supabase
    .from("regions")
    .select("id, slug, name, province, hero_image, sort_order, parent_id")
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
  }));
}

/**
 * Özyinelemeli bölge ağacı.
 *
 * ESKİ HATALI DAVRANIŞ: ağaç tam dört seviye elle kuruluyordu
 * (şehir → ilçe → mahalle → altBölge) ve daha derini hiç toplamıyordu. Gerçek
 * veride zincirler 6 seviyeye indiği için 25 bölgenin 7'si panelde HİÇ
 * görünmüyordu; yönetici onları göremiyor, düzenleyemiyor, taşıyamıyordu.
 * Artık derinlik sınırsız okunur — `MAX_REGION_DEPTH` yalnızca yazmayı sınırlar.
 */
export async function getAdminRegionTree(): Promise<AdminRegionTree> {
  const all = await getAdminRegions();
  return buildRegionTree(all);
}

export interface RegionParentOption {
  id: string;
  label: string;
  depth: number;
}

/**
 * "Üst Bölge" seçim listesi — ağaç sırasında, ekmek kırıntısı etiketiyle.
 *
 * @param excludeId Düzenlenen bölge. Kendisi ve TÜM alt ağacı listeden çıkarılır;
 *   aksi hâlde kullanıcı bir bölgeyi kendi alt bölgesinin altına taşımayı
 *   deneyip veritabanının `regions_no_cycle` hatasına çarpardı.
 */
export async function getRegionParentOptions(
  excludeId?: string
): Promise<RegionParentOption[]> {
  const all = await getAdminRegions();
  const byId = new Map(all.map((r) => [r.id, r]));

  const { roots, orphans } = buildRegionTree(all);
  const flat = [
    ...flattenRegionTree(roots),
    // Yetimler de üst seçilebilsin — ağacın dışında kalmaları veri hatası,
    // kullanıcının onları düzeltebilmesi gerekiyor.
    ...orphans.map((o) => ({ ...o, depth: 0 })),
  ];

  const blocked = excludeId
    ? regionSubtreeIds(excludeId, all)
    : new Set<string>();

  return flat
    // Bir bölge ancak çocuğu sınırı aşmayacaksa üst olabilir:
    // çocuk derinliği = depth + 1 ≤ MAX_REGION_DEPTH.
    .filter((r) => !blocked.has(r.id) && r.depth < MAX_REGION_DEPTH)
    .map((r) => {
      const chain = regionAncestors(r.id, byId).map((a) => a.name);
      const path = [...chain, r.name].join(" › ");
      return {
        id: r.id,
        label: `${path} (${regionLevelLabel(r.depth)})`,
        depth: r.depth,
      };
    });
}
