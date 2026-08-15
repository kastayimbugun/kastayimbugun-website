import { z } from "zod";

const iso = /^\d{4}-\d{2}-\d{2}$/;

/** Sezon fiyatı ekleme. */
export const seasonSchema = z
  .object({
    villaId: z.uuid(),
    labelTr: z.string().trim().min(1, "Etiket gerekli").max(60),
    labelEn: z.string().trim().min(1, "Etiket gerekli").max(60),
    startsOn: z.string().regex(iso, "Geçerli tarih girin"),
    endsOn: z.string().regex(iso, "Geçerli tarih girin"),
    price: z.coerce.number().nonnegative("Fiyat negatif olamaz"),
  })
  .refine((d) => d.endsOn > d.startsOn, {
    message: "Bitiş, başlangıçtan sonra olmalı",
    path: ["endsOn"],
  });

/** Sezon fiyatı düzenleme. */
export const updateSeasonSchema = z
  .object({
    id: z.uuid(),
    villaId: z.uuid(),
    labelTr: z.string().trim().min(1, "Etiket gerekli").max(60),
    labelEn: z.string().trim().min(1, "Etiket gerekli").max(60),
    startsOn: z.string().regex(iso, "Geçerli tarih girin"),
    endsOn: z.string().regex(iso, "Geçerli tarih girin"),
    price: z.coerce.number().nonnegative("Fiyat negatif olamaz"),
  })
  .refine((d) => d.endsOn > d.startsOn, {
    message: "Bitiş, başlangıçtan sonra olmalı",
    path: ["endsOn"],
  });

/** Takvimde tarih kapatma (elle blok). */
export const blockSchema = z
  .object({
    villaId: z.uuid(),
    startsOn: z.string().regex(iso, "Geçerli tarih girin"),
    endsOn: z.string().regex(iso, "Geçerli tarih girin"),
    note: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.endsOn > d.startsOn, {
    message: "Bitiş, başlangıçtan sonra olmalı",
    path: ["endsOn"],
  });

/** Bir alt kaydı silme (sezon/blok). */
export const deleteChildSchema = z.object({
  id: z.uuid(),
  villaId: z.uuid(),
});

const time = /^\d{2}:\d{2}$/;
const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const emptyToNull = (v: unknown) => (v === "" || v == null ? null : v);

/** Villa temel alanları (ekleme + düzenleme ortak). */
export const villaFormSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter").max(120),
  slug: z
    .string()
    .trim()
    .regex(slugRe, "Küçük harf, rakam ve tire (ör. villa-deniz-kalkan)"),
  regionId: z.uuid("Bölge seçin"),
  status: z.enum(["draft", "published", "archived"]),
  capacity: z.coerce.number().int().min(1, "En az 1").max(100),
  bedrooms: z.coerce.number().int().min(0).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50),
  pool: z.enum(["private", "shared", "none"]),
  sizeM2: z.coerce.number().int().min(0).max(100000),
  // Havuz ölçüleri (m) — opsiyonel, ondalık olabilir (ör. derinlik 1.5).
  poolWidth: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0).max(200).nullable()
  ),
  poolLength: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0).max(200).nullable()
  ),
  poolDepth: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0).max(50).nullable()
  ),
  distanceToSea: z.coerce.number().int().min(0).max(1000000),
  // Mesafe cetveli — hepsi opsiyonel (km). Boş bırakılırsa o satır gösterilmez.
  distanceAirportKm: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(20000).nullable()
  ),
  distanceMarketKm: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(20000).nullable()
  ),
  distanceRestaurantKm: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(20000).nullable()
  ),
  distanceTransitKm: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(20000).nullable()
  ),
  distanceCenterKm: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(20000).nullable()
  ),
  rating: z.coerce.number().min(0).max(5),
  reviewCount: z.coerce.number().int().min(0),
  featured: z.coerce.boolean(),
  discountPercent: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(90).nullable()
  ),
  dealTag: z.preprocess(
    emptyToNull,
    z.enum(["shortStay", "earlyBooking", "lastMinute"]).nullable()
  ),
  checkIn: z.string().regex(time, "SS:DD biçiminde"),
  checkOut: z.string().regex(time, "SS:DD biçiminde"),
  minNights: z.coerce.number().int().min(1).max(60),
  basePrice: z.coerce.number().min(0, "Fiyat negatif olamaz"),
  cleaningFee: z.coerce.number().min(0),
  // Hasar depozitosu (₺) — opsiyonel; boş bırakılırsa detayda gösterilmez.
  damageDeposit: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(10000000).nullable()
  ),
  // T.C. Kültür ve Turizm Bakanlığı belge no — opsiyonel metin (ör. "48-6108").
  ministryCertNo: z.preprocess(
    emptyToNull,
    z.string().trim().max(40, "Belge no en fazla 40 karakter").nullable()
  ),
  serviceRate: z.coerce.number().min(0).max(1),
  // Fiyat kuralları (4.3) — hepsi opsiyonel; boş/0 uygulanmaz.
  weekendPremiumPercent: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(100).nullable()
  ),
  losWeeklyDiscountPercent: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(90).nullable()
  ),
  losMonthlyDiscountPercent: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(90).nullable()
  ),
  lastMinuteDiscountPercent: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(0).max(90).nullable()
  ),
  lastMinuteDays: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1).max(90).nullable()
  ),
  extraGuestFee: z.preprocess(
    emptyToNull,
    z.coerce.number().min(0).max(1_000_000).nullable()
  ),
  extraGuestAfter: z.preprocess(
    emptyToNull,
    z.coerce.number().int().min(1).max(100).nullable()
  ),
  descriptionTr: z.preprocess(emptyToNull, z.string().max(4000).nullable()),
  descriptionEn: z.preprocess(emptyToNull, z.string().max(4000).nullable()),
  videoUrl: z.preprocess(
    emptyToNull,
    z.url("Geçerli bir bağlantı girin").nullable()
  ),
  amenities: z.array(z.string().max(40)).max(60),
  /** Villanın atandığı kategoriler (villa_categories). */
  categoryIds: z.array(z.uuid()).max(50).default([]),
});

export type VillaFormInput = z.infer<typeof villaFormSchema>;

/** Düzenleme: forma id eklenir. */
export const updateVillaSchema = villaFormSchema.extend({
  id: z.uuid(),
  /**
   * Formun açıldığı andaki `updated_at`. Sunucu bunu WHERE'e koyar: satır o
   * sırada başkası tarafından değiştirilmişse güncelleme eşleşmez ve reddedilir.
   * Opsiyonel — göndermeyen eski istemciyi kırmamak için (kontrol atlanır).
   */
  updatedAt: z.string().optional(),
});

/**
 * Villa listesi URL parametreleri. Bozuk değer sorguyu patlatmasın diye her
 * alan `.catch(undefined)` ile yutulur (talepler listesiyle aynı desen).
 */
export const villaQuerySchema = z.object({
  durum: z.enum(["draft", "published", "archived"]).optional().catch(undefined),
  q: z.string().trim().max(60).optional().catch(undefined),
  bolge: z.uuid().optional().catch(undefined),
  sirala: z.enum(["ad", "fiyat", "yeni"]).optional().catch(undefined),
  sayfa: z.coerce.number().int().min(1).max(9999).optional().catch(undefined),
});

export type VillaQuery = z.infer<typeof villaQuerySchema>;

/** Görsel alt metni güncelleme. */
export const imageAltSchema = z.object({
  id: z.uuid(),
  villaId: z.uuid(),
  altTr: z.string().trim().max(160),
});

/** Görsel sırası değiştirme (yukarı/aşağı). */
export const reorderImageSchema = z.object({
  id: z.uuid(),
  villaId: z.uuid(),
  direction: z.enum(["up", "down"]),
});

/**
 * Tüm görsel sırasını tek seferde yaz (sürükle-bırak ve "kapak yap").
 * orderedIds[0] kapak olur. Tek tek takas yerine tam sıra: 12. fotoğrafı
 * kapak yapmak 11 gidiş-dönüş yerine tek yazma (yol haritası 4.2).
 */
export const reorderImagesSchema = z.object({
  villaId: z.uuid(),
  orderedIds: z.array(z.uuid()).min(1).max(60),
});

/** Bir tarih aralığındaki onaylı rezervasyonu iptal edip tarihleri açma. */
export const cancelReservationSchema = z.object({
  villaId: z.uuid(),
  startsOn: z.string().regex(iso),
  endsOn: z.string().regex(iso),
});
