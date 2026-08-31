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

/**
 * Kartta, detay başlığında ve mobil çubukta İLAN EDİLEN gecelik aralık —
 * flaş indirim uygulanmış hâli.
 *
 * Ayrı bir fonksiyon, çünkü indirim çarpanı üç ayrı yerde elle yazılıyordu ve
 * ikisi unutulmuştu: kart indirimli, villa detayının başlığı ve mobil çubuk
 * indirimsiz fiyat gösteriyordu. Aynı villada üç farklı rakam demekti.
 */
export function displayPriceRange(
  v: PriceRangeInput & { discountPercent?: number | null }
): { min: number; max: number } {
  const { min, max } = priceRange(v);
  const d = v.discountPercent;
  if (!d || d <= 0) return { min, max };
  const f = 1 - d / 100;
  return { min: Math.round(min * f), max: Math.round(max * f) };
}

/** Sezonluk fiyatlardan gecelik fiyat aralığı (min–max), indirim UYGULANMADAN. */
export function priceRange(v: PriceRangeInput): { min: number; max: number } {
  const prices = v.seasons.map((s) => s.price);
  if (!prices.length) return { min: v.pricePerNight, max: v.pricePerNight };
  return { min: Math.min(...prices), max: Math.max(...prices) };
}
