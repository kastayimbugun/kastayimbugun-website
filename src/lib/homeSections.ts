/**
 * Ana sayfa içerik bölümlerinin sırası ve aç/kapa durumu.
 *
 * İçerik bölgesi (üst kayar şerit ile "Popüler Bölgeler" arasında) artık sabit
 * değil: Öne Çıkan Villalar, Reklam Bandı, Kısa Kaçamak Fırsatları ve öne çıkan
 * kategori satırları tek bir sıralı listede yönetilir. Sıra `site_settings`
 * içinde `home_sections` jsonb'sinde saklanır.
 *
 * Anahtarlar:
 *   "featured"   → Öne Çıkan Villalar bölümü
 *   "banner"     → Reklam / kampanya bandı
 *   "shortStay"  → Kısa kaçamak fırsatları
 *   "category:<slug>" → öne çıkan bir kategori satırı
 */

export type SpecialKey = "featured" | "banner" | "shortStay" | "regions";

export interface HomeSectionItem {
  key: string;
  enabled: boolean;
}

export const SPECIAL_KEYS: SpecialKey[] = [
  "featured",
  "banner",
  "shortStay",
  "regions",
];

export const SPECIAL_LABELS: Record<SpecialKey, string> = {
  featured: "Öne Çıkan Villalar",
  banner: "Reklam / Kampanya Bandı",
  shortStay: "Kısa Kaçamak Fırsatları",
  regions: "Popüler Bölgeler",
};

const CATEGORY_PREFIX = "category:";
export const isCategoryKey = (key: string) => key.startsWith(CATEGORY_PREFIX);
export const categorySlugOf = (key: string) => key.slice(CATEGORY_PREFIX.length);
export const categoryKey = (slug: string) => `${CATEGORY_PREFIX}${slug}`;

/** Ham jsonb değerini normalize eder; geçersizse null (→ varsayılan sıra). */
export function parseHomeSections(value: unknown): HomeSectionItem[] | null {
  if (value == null || !Array.isArray(value)) return null;
  const out: HomeSectionItem[] = [];
  const seen = new Set<string>();
  for (const it of value) {
    if (!it || typeof it !== "object") continue;
    const key = (it as { key?: unknown }).key;
    if (typeof key !== "string" || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, enabled: (it as { enabled?: unknown }).enabled !== false });
  }
  return out.length > 0 ? out : null;
}

/** Hiç kayıt yokken kullanılan makul varsayılan sıra (mevcut düzene yakın). */
export function defaultHomeSections(featuredSlugs: string[]): HomeSectionItem[] {
  const items: HomeSectionItem[] = [
    { key: "banner", enabled: true },
    { key: "featured", enabled: true },
  ];
  featuredSlugs.forEach((slug, i) => {
    items.push({ key: categoryKey(slug), enabled: true });
    // Kısa kaçamak bloğu varsayılan olarak ilk kategoriden sonra gelir.
    if (i === 0) items.push({ key: "shortStay", enabled: true });
  });
  if (featuredSlugs.length === 0) items.push({ key: "shortStay", enabled: true });
  // Popüler Bölgeler varsayılan olarak içerik akışının sonunda.
  items.push({ key: "regions", enabled: true });
  return items;
}

/**
 * Kayıtlı sırayı canlı verilerle uzlaştırır:
 * - Öne çıkan olmayan (silinmiş/kapatılmış) kategori anahtarlarını atar,
 * - eksik özel bölümleri ve yeni öne çıkan kategorileri sona ekler.
 */
export function reconcileHomeSections(
  list: HomeSectionItem[] | null,
  featuredSlugs: string[]
): HomeSectionItem[] {
  if (!list || list.length === 0) return defaultHomeSections(featuredSlugs);

  const featuredSet = new Set(featuredSlugs);
  const seen = new Set<string>();
  const out: HomeSectionItem[] = [];

  for (const it of list) {
    if (seen.has(it.key)) continue;
    if (isCategoryKey(it.key) && !featuredSet.has(categorySlugOf(it.key))) continue;
    seen.add(it.key);
    out.push({ key: it.key, enabled: it.enabled !== false });
  }

  // Eksik özel bölümler (varsayılan açık).
  for (const k of SPECIAL_KEYS) {
    if (!seen.has(k)) {
      out.push({ key: k, enabled: true });
      seen.add(k);
    }
  }
  // Yeni öne çıkan kategoriler — sona eklenir.
  for (const slug of featuredSlugs) {
    const k = categoryKey(slug);
    if (!seen.has(k)) {
      out.push({ key: k, enabled: true });
      seen.add(k);
    }
  }

  return out;
}
