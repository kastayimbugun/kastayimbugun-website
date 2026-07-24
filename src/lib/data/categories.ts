import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type CategoryColor =
  | "amber"
  | "rose"
  | "sky"
  | "emerald"
  | "violet"
  | "teal";

export interface Category {
  slug: string;
  titleTr: string;
  titleEn: string;
  descTr: string;
  descEn: string;
  color: CategoryColor;
  image: string;
  /** lucide ikon adı — src/lib/categoryIcons.tsx ile bileşene çevrilir */
  iconName: string | null;
  /** true → ana sayfada tam kaydırmalı satır olarak gösterilir */
  featuredOnHome: boolean;
  /** Kategorideki villalar, elle belirlenen sırayla */
  villaSlugs: string[];
}

interface CategoryRow {
  slug: string;
  name_tr: string;
  name_en: string;
  desc_tr: string | null;
  desc_en: string | null;
  color: CategoryColor;
  image: string | null;
  icon: string | null;
  featured_on_home: boolean;
  villa_categories: {
    sort_order: number;
    villas: { slug: string; status: string } | null;
  }[];
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabaseServer()
    .from("categories")
    .select(
      `slug, name_tr, name_en, desc_tr, desc_en, color, image, icon, featured_on_home,
       villa_categories ( sort_order, villas ( slug, status ) )`
    )
    .order("sort_order");

  if (error) throw new Error(`Kategoriler okunamadı: ${error.message}`);

  return (data as unknown as CategoryRow[]).map((c) => ({
    slug: c.slug,
    titleTr: c.name_tr,
    titleEn: c.name_en,
    descTr: c.desc_tr ?? "",
    descEn: c.desc_en ?? "",
    color: c.color,
    image: c.image ?? "",
    iconName: c.icon,
    featuredOnHome: c.featured_on_home,
    villaSlugs: [...c.villa_categories]
      .filter((vc) => vc.villas?.status === "published")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((vc) => vc.villas!.slug),
  }));
}
