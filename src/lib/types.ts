export type PoolType = "private" | "shared" | "none";

export type AmenityKey =
  | "privatePool"
  | "heatedPool"
  | "protectedPool"
  | "wifi"
  | "airCon"
  | "seaView"
  | "natureView"
  | "jacuzzi"
  | "sauna"
  | "bbq"
  | "parking"
  | "petFriendly"
  | "babyCot"
  | "dishwasher"
  | "washingMachine"
  | "kitchen"
  | "tv"
  | "fireplace"
  | "gym"
  | "gameRoom"
  | "kidsPool"
  | "childproof"
  | "generator";

export interface Villa {
  slug: string;
  name: string;
  /** Kartlarda gösterilen tesis kodu (KBV1234). Yoksa slug'dan üretilir. */
  code?: string;
  region: string; // e.g. "Kalkan"
  province: string; // e.g. "Antalya"
  images: string[];
  videoUrl?: string; // youtube embed url
  capacity: number; // people
  bedrooms: number;
  bathrooms: number;
  pool: PoolType;
  /** Havuz ölçüleri (metre) — panelde doldurulmazsa detayda gösterilmez. */
  poolWidth?: number | null; // en
  poolLength?: number | null; // boy
  poolDepth?: number | null; // derinlik
  size: number; // m2
  distanceToSea: number; // meters
  /**
   * Panelden girilen mesafeler (km). Doldurulmayan alan mesafe cetvelinde
   * hiç gösterilmez — tahmini/uydurma değer basmaktansa satırı atlamak doğru.
   */
  distanceAirportKm?: number | null;
  distanceMarketKm?: number | null;
  distanceRestaurantKm?: number | null;
  distanceTransitKm?: number | null;
  distanceCenterKm?: number | null;
  rating: number; // 0-5
  reviewCount: number;
  featured: boolean;
  /** İndirim yüzdesi (ör. 20) — varsa kartta indirim rozeti + eski/yeni fiyat gösterilir */
  discountPercent?: number;
  /** Fırsat türü etiketi */
  dealTag?: "shortStay" | "earlyBooking" | "lastMinute";
  amenities: AmenityKey[];
  descriptionTr: string;
  descriptionEn: string;
  checkIn: string; // "16:00"
  checkOut: string; // "10:00"
  minNights: number;
  pricePerNight: number; // base nightly price in TRY
  /** Temizlik bedeli (villa bazında; eskiden kodda sabitti) */
  cleaningFee?: number;
  /** Hasar/güvence depozitosu (₺) — girişte alınır, sorunsuz çıkışta iade edilir. */
  damageDeposit?: number | null;
  /** T.C. Kültür ve Turizm Bakanlığı işletme belge numarası (villaya özel). */
  ministryCertNo?: string | null;
  /** Hizmet bedeli oranı, ör. 0.05 */
  serviceRate?: number;
  /** Fiyat kuralları (Faz 5.7 / 4.3) — hepsi opsiyonel, calcPrice'ta uygulanır. */
  weekendPremiumPercent?: number | null;
  losWeeklyDiscountPercent?: number | null;
  losMonthlyDiscountPercent?: number | null;
  lastMinuteDiscountPercent?: number | null;
  lastMinuteDays?: number | null;
  extraGuestFee?: number | null;
  extraGuestAfter?: number | null;
  /** Reserved date ranges (ISO yyyy-mm-dd, inclusive start, exclusive end) */
  bookedRanges: { start: string; end: string }[];
  /** Seasonal pricing rows shown in the price table */
  seasons: {
    labelTr: string;
    labelEn: string;
    start: string;
    end: string;
    price: number;
  }[];
}

export interface CustomPage {
  id: string;
  slug: string;
  titleTr: string;
  titleEn: string;
  contentTr: string;
  contentEn: string;
  metaTitleTr?: string | null;
  metaTitleEn?: string | null;
  metaDescriptionTr?: string | null;
  metaDescriptionEn?: string | null;
  status: "draft" | "published";
  showInFooter: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PageInput {
  slug: string;
  titleTr: string;
  titleEn: string;
  contentTr: string;
  contentEn: string;
  metaTitleTr?: string;
  metaTitleEn?: string;
  metaDescriptionTr?: string;
  metaDescriptionEn?: string;
  status: "draft" | "published";
  showInFooter: boolean;
  sortOrder: number;
}

