import { cache } from "react";
import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type CategoryColor =
  | "amber"
  | "rose"
  | "sky"
  | "emerald"
  | "violet"
  | "teal";

/** Otomatik dolan vitrin bloğunun villa seçme kuralı (categories.auto_rule). */
export type AutoRule = "popular" | "last_minute" | "cheapest" | "newest";

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
  /** true → ana sayfada üst kayar şeritte gösterilir */
  showInBrowser: boolean;
  /** Dolu ise villalar elle değil bu kurala göre otomatik seçilir */
  autoRule: AutoRule | null;
  /** Kategorideki villalar, elle belirlenen (veya kuralca üretilen) sırayla */
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
  show_in_browser?: boolean;
  auto_rule?: AutoRule | null;
  auto_limit?: number | null;
  villa_categories: {
    sort_order: number;
    villas: { slug: string; status: string } | null;
  }[];
}

/** Otomatik kuralları uygulamak için gereken en az villa alanı. */
interface AutoVilla {
  slug: string;
  rating: number;
  base_price: number;
  discount_percent: number | null;
  deal_tag: string | null;
  created_at: string;
}

async function getAutoRuleVillas(
  supabase: ReturnType<typeof supabaseServer>
): Promise<AutoVilla[]> {
  const { data, error } = await supabase
    .from("villas")
    .select("slug, rating, base_price, discount_percent, deal_tag, created_at")
    .eq("status", "published");
  if (error || !data) return [];
  return (data as unknown as Array<Record<string, unknown>>).map((v) => ({
    slug: String(v.slug),
    rating: Number(v.rating ?? 0),
    base_price: Number(v.base_price ?? 0),
    discount_percent:
      v.discount_percent == null ? null : Number(v.discount_percent),
    deal_tag: (v.deal_tag as string | null) ?? null,
    created_at: String(v.created_at ?? ""),
  }));
}

/**
 * Bir otomatik bloğun villa slug'larını üretir. Elle sabitlenmiş villalar
 * (`pinned`) her zaman önce gelir; kalan yerler kural sonuçlarıyla tekrarsız
 * doldurulur ve toplam `limit`'i aşmaz.
 */
function autoSlugs(
  rule: AutoRule,
  limit: number,
  pinned: string[],
  villas: AutoVilla[]
): string[] {
  let pool = villas;
  if (rule === "last_minute") {
    pool = villas.filter(
      (v) => (v.discount_percent ?? 0) > 0 || v.deal_tag === "last_minute"
    );
  }

  const sorted = [...pool].sort((a, b) => {
    switch (rule) {
      case "popular":
        return b.rating - a.rating;
      case "cheapest":
        return a.base_price - b.base_price;
      case "newest":
        return b.created_at.localeCompare(a.created_at);
      case "last_minute":
        return (b.discount_percent ?? 0) - (a.discount_percent ?? 0);
    }
  });

  const ordered = [...pinned, ...sorted.map((v) => v.slug)];
  return [...new Set(ordered)].slice(0, limit);
}

export const getCategories = cache(async (): Promise<Category[]> => {
  const supabase = supabaseServer();
  const fullSelect = `slug, name_tr, name_en, desc_tr, desc_en, color, image, icon, featured_on_home, show_in_browser, auto_rule, auto_limit,
       villa_categories ( sort_order, villas ( slug, status ) )`;

  let queryResult = await supabase
    .from("categories")
    .select(fullSelect)
    .order("sort_order");

  // Yeni kolonlar (0011/0012) henüz uygulanmadıysa minimal şemayla devam et.
  if (
    queryResult.error &&
    /show_in_browser|auto_rule|auto_limit/.test(queryResult.error.message ?? "")
  ) {
    queryResult = (await supabase
      .from("categories")
      .select(
        `slug, name_tr, name_en, desc_tr, desc_en, color, image, icon, featured_on_home,
         villa_categories ( sort_order, villas ( slug, status ) )`
      )
      .order("sort_order")) as typeof queryResult;
  }

  if (queryResult.error)
    throw new Error(`Kategoriler okunamadı: ${queryResult.error.message}`);

  const rows = queryResult.data as unknown as CategoryRow[];

  // Otomatik blok varsa villa verisini yalnızca bir kez çek.
  const needsAuto = rows.some((c) => c.auto_rule);
  const autoVillas = needsAuto ? await getAutoRuleVillas(supabase) : [];

  return rows.map((c) => {
    const manualSlugs = [...c.villa_categories]
      .filter((vc) => vc.villas?.status === "published")
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((vc) => vc.villas!.slug);

    const villaSlugs = c.auto_rule
      ? autoSlugs(c.auto_rule, c.auto_limit ?? 12, manualSlugs, autoVillas)
      : manualSlugs;

    return {
      slug: c.slug,
      titleTr: c.name_tr,
      titleEn: c.name_en,
      descTr: c.desc_tr ?? "",
      descEn: c.desc_en ?? "",
      color: c.color,
      image: c.image ?? "",
      iconName: c.icon,
      featuredOnHome: c.featured_on_home,
      showInBrowser: c.show_in_browser ?? true,
      autoRule: c.auto_rule ?? null,
      villaSlugs,
    };
  });
})
