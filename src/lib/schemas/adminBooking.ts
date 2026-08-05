import { z } from "zod";

// Talep durumu geçişleri için şema (panel).
export const bookingStatusSchema = z.enum([
  "new",
  "contacted",
  "confirmed",
  "cancelled",
]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

export const updateBookingStatusSchema = z.object({
  id: z.uuid(),
  status: bookingStatusSchema,
});

/**
 * Ödeme/depozito kaydı — kaspanel26'daki karşılığı: Ödenmiş, Hasar Depozito.
 * "Girişte ödenecek ücret" ayrıca saklanmaz; toplam tutardan ödenen tutar
 * çıkarılarak ekranda hesaplanır (sihirli/çift kaynak sayı olmasın diye).
 */
export const bookingPaymentSchema = z.object({
  id: z.uuid(),
  paidAmount: z.coerce.number().min(0, "Negatif olamaz").max(10_000_000),
  damageDeposit: z.coerce.number().min(0, "Negatif olamaz").max(10_000_000),
  depositNote: z
    .string()
    .trim()
    .max(200, "En fazla 200 karakter")
    .optional()
    .transform((v) => (v ? v : null)),
});

const isoDateBase = /^\d{4}-\d{2}-\d{2}$/;
const phoneChars = /^[\d\s()+-]+$/;

/**
 * Panelden doğrudan (telefonla gelen) rezervasyon girişi. Talep aşamasından
 * geçmez — kayıt doğrudan `confirmed` olarak oluşturulur (bkz. actions/admin/
 * bookings.ts `createManualBooking`). Alan kısıtları herkese açık formun
 * şemasıyla (schemas/booking.ts) bilerek tutarlı tutuldu.
 */
export const manualBookingSchema = z
  .object({
    villaId: z.uuid("Villa seçin"),
    checkIn: z.string().regex(isoDateBase, "Geçerli bir giriş tarihi girin"),
    checkOut: z.string().regex(isoDateBase, "Geçerli bir çıkış tarihi girin"),
    adults: z.coerce.number().int().min(1, "En az 1 yetişkin gerekli").max(50),
    children: z.coerce.number().int().min(0).max(50),
    babies: z.coerce.number().int().min(0).max(50),
    fullName: z.string().trim().min(2, "Ad soyad en az 2 karakter").max(120),
    phone: z
      .string()
      .trim()
      .min(7, "Telefon numarası eksik")
      .max(20, "Telefon numarası çok uzun")
      .regex(phoneChars, "Telefon numarası geçersiz karakter içeriyor"),
    email: z
      .union([z.email("Geçerli bir e-posta girin"), z.literal("")])
      .optional()
      .transform((v) => (v ? v : null)),
    priceEstimate: z.coerce.number().min(0, "Negatif olamaz").max(10_000_000),
    paidAmount: z.coerce.number().min(0, "Negatif olamaz").max(10_000_000),
    damageDeposit: z.coerce.number().min(0, "Negatif olamaz").max(10_000_000),
    note: z
      .string()
      .trim()
      .max(1000, "En fazla 1000 karakter")
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((d) => d.checkOut > d.checkIn, {
    message: "Çıkış tarihi girişten sonra olmalı",
    path: ["checkOut"],
  });

/**
 * Talepler ekranının URL parametreleri.
 *
 * Her alan `.catch(undefined)` ile sarılı: adres çubuğuna elle yazılmış bozuk
 * bir değer (ör. `?villa=abc`) sorguyu patlatmak yerine o filtreyi yok sayar.
 * Filtrelerin URL'de tutulması sayfanın paylaşılabilir ve geri tuşuyla
 * gezilebilir olmasını sağlar.
 */
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const bookingQuerySchema = z.object({
  durum: bookingStatusSchema.optional().catch(undefined),
  q: z.string().trim().max(60).optional().catch(undefined),
  villa: z.uuid().optional().catch(undefined),
  baslangic: z.string().regex(isoDate).optional().catch(undefined),
  bitis: z.string().regex(isoDate).optional().catch(undefined),
  sirala: z.enum(["yeni", "giris"]).optional().catch(undefined),
  sayfa: z.coerce.number().int().min(1).max(9999).optional().catch(undefined),
});

export type BookingQuery = z.infer<typeof bookingQuerySchema>;

// Kullanıcıya görünen Türkçe etiketler (panel tek dilli).
export const bookingStatusLabel: Record<BookingStatus, string> = {
  new: "Yeni",
  contacted: "Görüşüldü",
  confirmed: "Onaylandı",
  cancelled: "İptal",
};
