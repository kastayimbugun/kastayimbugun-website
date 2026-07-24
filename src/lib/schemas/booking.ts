import { z } from "zod";

// Rezervasyon talebi giriş şeması.
// Bu şema hem istemcide (UX doğrulaması) hem de sunucuda (güven sınırı) çalışır.
// ARCHITECTURE.md §3: güvenlik kararı her zaman sunucuda verilir; istemci doğrulaması
// yalnızca kullanıcı deneyimi içindir. Bu yüzden şema saf ve import'suz tutulur.

// ISO tarih biçimi: yyyy-mm-dd
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

// Telefon için GEVŞEK biçim: yalnızca izin verilen karakterleri sınırla
// (rakam, boşluk, +, -, parantez). Katı bir maske dayatma —
// kullanıcı 0555..., +90 555..., (0555)... yazabilmeli.
const phoneChars = /^[\d\s()+-]+$/;

export const bookingRequestSchema = z
  .object({
    villaSlug: z.string().min(1, "Villa seçilmedi"),

    checkIn: z.string().regex(isoDate, "Geçerli bir giriş tarihi girin"),
    checkOut: z.string().regex(isoDate, "Geçerli bir çıkış tarihi girin"),

    // Kişi sayıları — tam sayı, makul üst sınırlar.
    adults: z
      .number()
      .int("Yetişkin sayısı tam sayı olmalı")
      .min(1, "En az 1 yetişkin gerekli")
      .max(50, "Yetişkin sayısı çok yüksek"),
    children: z
      .number()
      .int("Çocuk sayısı tam sayı olmalı")
      .min(0, "Çocuk sayısı negatif olamaz")
      .max(50, "Çocuk sayısı çok yüksek"),
    babies: z
      .number()
      .int("Bebek sayısı tam sayı olmalı")
      .min(0, "Bebek sayısı negatif olamaz")
      .max(50, "Bebek sayısı çok yüksek"),

    fullName: z
      .string()
      .trim()
      .min(2, "Ad soyad en az 2 karakter olmalı")
      .max(120, "Ad soyad çok uzun"),

    // Telefon: kırp, uzunluk sınırla, izinli karakterleri kontrol et.
    phone: z
      .string()
      .trim()
      .min(7, "Telefon numarası eksik")
      .max(20, "Telefon numarası çok uzun")
      .regex(phoneChars, "Telefon numarası geçersiz karakter içeriyor"),

    // E-posta opsiyonel: geçerli e-posta VEYA boş string VEYA tanımsız.
    email: z
      .union([z.email("Geçerli bir e-posta girin"), z.literal("")])
      .optional(),

    note: z.string().max(1000, "Not çok uzun").optional(),
  })
  // Çıkış tarihi girişten kesinlikle sonra olmalı.
  // ISO yyyy-mm-dd biçimi sözlüksel olarak kronolojik sıralanır, string karşılaştırması yeterli.
  .refine((data) => data.checkOut > data.checkIn, {
    message: "Çıkış tarihi girişten sonra olmalı",
    path: ["checkOut"],
  });

export type BookingRequestInput = z.infer<typeof bookingRequestSchema>;
