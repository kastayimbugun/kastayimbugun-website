import { z } from "zod";

/**
 * Talep durumları — satış hattı (Faz 5.7 / yol haritası 2.3).
 *
 * new → contacted → quoted → confirmed / lost
 *
 * `quoted` ("fiyat verildi, bekliyorum") eklendi: telefonla satışta talebin
 * en uzun kaldığı aşama buydu ve panelde hiç görünmüyordu.
 * `lost` ile `cancelled` bilerek ayrı: `lost` hiç kazanılamamış talep,
 * `cancelled` onaylanmış bir rezervasyonun iptali.
 */
export const bookingStatusSchema = z.enum([
  "new",
  "contacted",
  "quoted",
  "confirmed",
  "cancelled",
  "lost",
]);

export type BookingStatus = z.infer<typeof bookingStatusSchema>;

/**
 * Kayıp sebebi zorunlu bir listeden seçilir: serbest metin üç ayda
 * analiz edilemez, "%40 tarih doluydu" gibi bir sonuç ise doğrudan
 * fiyat/stok kararına dönüşür.
 */
export const lostReasonSchema = z.enum([
  "price",
  "dates_unavailable",
  "no_response",
  "chose_other",
  "gave_up",
]);

export type LostReason = z.infer<typeof lostReasonSchema>;

export const updateBookingStatusSchema = z
  .object({
    id: z.uuid(),
    status: bookingStatusSchema,
    lostReason: lostReasonSchema.optional(),
  })
  // DB'de de aynı kısıt var (0006 migration); burada yakalanınca kullanıcı
  // veritabanı hatası yerine alan altında mesaj görür.
  .refine((d) => d.status !== "lost" || d.lostReason != null, {
    message: "Kayıp sebebini seçin",
    path: ["lostReason"],
  });

export const deleteBookingSchema = z.object({
  id: z.uuid(),
});

/**
 * Arama notu. Personel değişiminde bilgi kaybını sıfırlayan tek şey bu:
 * "14:20 aradım, meşguldü" / "15:00 fiyat gönderildi".
 */
export const bookingNoteSchema = z.object({
  bookingId: z.uuid(),
  body: z
    .string()
    .trim()
    .min(1, "Not boş olamaz")
    .max(1000, "En fazla 1000 karakter"),
  /**
   * Bir sonraki takip zamanı (`datetime-local` biçimi, ör. 2026-08-10T14:00).
   * Boş gönderilirse talepteki takip tarihi temizlenir.
   */
  followUpAt: z
    .union([
      z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Geçersiz tarih"),
      z.literal(""),
    ])
    .optional(),
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
/**
 * Manuel giriş ile detay düzenleme aynı alanları paylaşır; kısıtlar tek yerde
 * dursun diye şekil burada tanımlanıp iki şemada da kullanılıyor.
 */
const bookingFields = {
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
};

const datesInOrder = {
  check: (d: { checkIn: string; checkOut: string }) => d.checkOut > d.checkIn,
  message: {
    message: "Çıkış tarihi girişten sonra olmalı",
    path: ["checkOut"],
  },
};

export const manualBookingSchema = z
  .object(bookingFields)
  .refine(datesInOrder.check, datesInOrder.message);

/**
 * Detay sayfasından tüm alanların düzenlenmesi.
 *
 * Durum bilerek dışarıda: durum değişiminin takvim yan etkisi
 * `updateBookingStatus` içinde yönetiliyor, iki yerde olmamalı.
 */
export const updateBookingSchema = z
  .object({
    ...bookingFields,
    id: z.uuid(),
    depositNote: z
      .string()
      .trim()
      .max(200, "En fazla 200 karakter")
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine(datesInOrder.check, datesInOrder.message);

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
  quoted: "Fiyat verildi",
  confirmed: "Onaylandı",
  cancelled: "İptal",
  lost: "Kaybedildi",
};

export const lostReasonLabel: Record<LostReason, string> = {
  price: "Fiyat",
  dates_unavailable: "Tarih doluydu",
  no_response: "Cevap vermedi",
  chose_other: "Başka villa buldu",
  gave_up: "Vazgeçti",
};
