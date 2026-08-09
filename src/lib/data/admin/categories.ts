import "server-only";
import { supabaseSession } from "@/lib/supabase/session";

export interface AdminCategoryListItem {
  id: string;
  slug: string;
  nameTr: string;
  color: string | null;
  featuredOnHome: boolean;
  showInBrowser: boolean;
  sortOrder: number;
  villaCount: number;
  /** Dolu ise villalar otomatik bir kurala göre seçilen "akıllı" blok. */
  autoRule: string | null;
}

export interface AdminCategoryFull {
  id: string;
  slug: string;
  nameTr: string;
  nameEn: string;
  descTr: string | null;
  descEn: string | null;
  color: string | null;
  icon: string | null;
  image: string | null;
  featuredOnHome: boolean;
  villaIds: string[];
}

export interface CategoryOption {
  id: string;
  nameTr: string;
}

/**
 * Villa formunda "Kategoriler" seçimi için sade liste. Otomatik/akıllı bloklar
 * (Popüler, Son Dakika vb. — auto_rule dolu) elle atanmaz, dışarıda bırakılır.
 */
export async function getCategoryOptions(): Promise<CategoryOption[]> {
  const supabase = await supabaseSession();
  let q = await supabase
    .from("categories")
    .select("id, name_tr, auto_rule")
    .order("sort_order");
  if (q.error && q.error.message?.includes("auto_rule")) {
    q = (await supabase
      .from("categories")
      .select("id, name_tr")
      .order("sort_order")) as typeof q;
  }
  if (q.error)
    throw new Error(`Kategori seçenekleri okunamadı: ${q.error.message}`);

  return (
    q.data as Array<{ id: string; name_tr: string; auto_rule?: string | null }>
  )
    .filter((c) => !c.auto_rule)
    .map((c) => ({ id: c.id, nameTr: c.name_tr }));
}

export async function getAdminCategories(): Promise<AdminCategoryListItem[]> {
  const supabase = await supabaseSession();
  // `villa_categories(count)`: ilişkili satırların gövdesi taşınmadan sayılır.
  // Önceki sürüm her kategori için tüm villa_id listesini çekip JS'te
  // uzunluğuna bakıyordu — ilişki büyüdükçe boşuna veri, üstelik PostgREST'in
  // satır sınırına dayanınca sayı sessizce yanlış olurdu.
  let queryResult = await supabase
    .from("categories")
    .select("id, slug, name_tr, color, featured_on_home, show_in_browser, sort_order, auto_rule, villa_categories(count)")
    .order("sort_order");

  if (
    queryResult.error &&
    /show_in_browser|auto_rule/.test(queryResult.error.message ?? "")
  ) {
    queryResult = (await supabase
      .from("categories")
      .select("id, slug, name_tr, color, featured_on_home, sort_order, villa_categories(count)")
      .order("sort_order")) as typeof queryResult;
  }

  if (queryResult.error) throw new Error(`Kategoriler okunamadı: ${queryResult.error.message}`);

  return (queryResult.data as unknown as Array<{
    id: string;
    slug: string;
    name_tr: string;
    color: string | null;
    featured_on_home: boolean;
    show_in_browser?: boolean;
    sort_order?: number;
    auto_rule?: string | null;
    villa_categories: { count: number }[];
  }>).map((c) => ({
    id: c.id,
    slug: c.slug,
    nameTr: c.name_tr,
    color: c.color,
    featuredOnHome: c.featured_on_home,
    showInBrowser: c.show_in_browser ?? true,
    sortOrder: c.sort_order ?? 0,
    villaCount: c.villa_categories?.[0]?.count ?? 0,
    autoRule: c.auto_rule ?? null,
  }));
}

export async function getAdminCategory(
  id: string
): Promise<AdminCategoryFull | null> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("categories")
    .select(
      `id, slug, name_tr, name_en, desc_tr, desc_en, color, icon, image,
       featured_on_home, villa_categories ( villa_id )`
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Kategori okunamadı: ${error.message}`);
  if (!data) return null;

  const c = data as Record<string, unknown>;
  return {
    id: c.id as string,
    slug: c.slug as string,
    nameTr: c.name_tr as string,
    nameEn: (c.name_en as string) ?? "",
    descTr: (c.desc_tr as string) ?? null,
    descEn: (c.desc_en as string) ?? null,
    color: (c.color as string) ?? null,
    icon: (c.icon as string) ?? null,
    image: (c.image as string) ?? null,
    featuredOnHome: Boolean(c.featured_on_home),
    villaIds: ((c.villa_categories as { villa_id: string }[]) ?? []).map(
      (v) => v.villa_id
    ),
  };
}

// Villa seçim listesi için `getVillaOptions` (data/admin/villas.ts) kullanılır —
// aynı sorgunun iki kopyası tutulmaz.
