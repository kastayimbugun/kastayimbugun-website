/** `priceRange` için gereken minimum şekil — tam `Villa` şart değil. */
export interface PriceRangeInput {
  pricePerNight: number;
  seasons: { price: number }[];
}

/**
 * Veri kaynağından bağımsız, istemcide de çalışan villa yardımcıları.
 * (Veri erişimi için src/lib/data/villas.ts kullanılır.)
 */

/** Kartlarda gösterilen tesis kodu — slug'dan üretilir, veri girilmediyse yedek. */
export function villaCode(slug: string): string {
  const sum = Array.from(slug).reduce((a, c) => a + c.charCodeAt(0), 0);
  return `KBV${1000 + ((sum * 37) % 9000)}`;
}

/** Sezonluk fiyatlardan gecelik fiyat aralığı (min–max). */
export function priceRange(v: PriceRangeInput): { min: number; max: number } {
  const prices = v.seasons.map((s) => s.price);
  if (!prices.length) return { min: v.pricePerNight, max: v.pricePerNight };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
