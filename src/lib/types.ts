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
  size: number; // m2
  distanceToSea: number; // meters
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
  /** Hizmet bedeli oranı, ör. 0.05 */
  serviceRate?: number;
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
