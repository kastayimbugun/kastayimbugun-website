import "server-only";
import { supabaseSession } from "@/lib/supabase/session";

export interface AdminCategoryListItem {
  id: string;
  slug: string;
  nameTr: string;
  color: string | null;
  featuredOnHome: boolean;
  villaCount: number;
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

export async function getAdminCategories(): Promise<AdminCategoryListItem[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("categories")
    .select("id, slug, name_tr, color, featured_on_home, villa_categories(villa_id)")
    .order("sort_order");
  if (error) throw new Error(`Kategoriler okunamadı: ${error.message}`);

  return (data as unknown as Array<{
    id: string;
    slug: string;
    name_tr: string;
    color: string | null;
    featured_on_home: boolean;
    villa_categories: { villa_id: string }[];
  }>).map((c) => ({
    id: c.id,
    slug: c.slug,
    nameTr: c.name_tr,
    color: c.color,
    featuredOnHome: c.featured_on_home,
    villaCount: c.villa_categories?.length ?? 0,
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
