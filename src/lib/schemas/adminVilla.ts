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
  distanceToSea: z.coerce.number().int().min(0).max(1000000),
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
  serviceRate: z.coerce.number().min(0).max(1),
  descriptionTr: z.preprocess(emptyToNull, z.string().max(4000).nullable()),
  descriptionEn: z.preprocess(emptyToNull, z.string().max(4000).nullable()),
  videoUrl: z.preprocess(
    emptyToNull,
    z.url("Geçerli bir bağlantı girin").nullable()
  ),
  amenities: z.array(z.string().max(40)).max(60),
});

export type VillaFormInput = z.infer<typeof villaFormSchema>;

/** Düzenleme: forma id eklenir. */
export const updateVillaSchema = villaFormSchema.extend({ id: z.uuid() });

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

/** Durum hızlı değiştirme. */
export const setStatusSchema = z.object({
  id: z.uuid(),
  status: z.enum(["draft", "published", "archived"]),
});

/** Bir tarih aralığındaki onaylı rezervasyonu iptal edip tarihleri açma. */
export const cancelReservationSchema = z.object({
  villaId: z.uuid(),
  startsOn: z.string().regex(iso),
  endsOn: z.string().regex(iso),
});
