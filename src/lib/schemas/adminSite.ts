import { z } from "zod";

/**
 * Hero videosu: sessiz, kısa bir döngü dosyası (mp4/webm).
 * YouTube gömme BİLEREK kabul edilmiyor — otomatik oynayan iframe hem LCP'yi
 * bozuyor hem de çerez onayı alınmadan 3. taraf çerezi yüklüyordu (KVKK).
 */
export const heroVideoSchema = z.object({
  heroVideoUrl: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z
      .url("Geçerli bir bağlantı girin")
      .refine((u) => u.startsWith("https://"), "Bağlantı https olmalı")
      .refine(
        (u) => /\.(mp4|webm)(\?.*)?$/i.test(u),
        "Yalnızca .mp4 veya .webm dosyası"
      )
      .nullable()
  ),
});

export type HeroVideoInput = z.infer<typeof heroVideoSchema>;

/**
 * Site ayarları metin alanları.
 *
 * Hepsi opsiyonel ve boş string `null`'a çevrilir: acente bir alanı boşaltınca
 * uygulama koddaki varsayılana geri döner (ör. i18n'deki hero başlığı). Bu
 * yüzden "zorunlu alan" yok — panel hiçbir metni tutsak almamalı.
 */
const emptyToNull = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? null : v;

const optionalText = (max: number, label: string) =>
  z.preprocess(
    emptyToNull,
    z.string().trim().max(max, `${label} en fazla ${max} karakter`).nullable()
  );

const optionalUrl = z.preprocess(
  emptyToNull,
  z
    .url("Geçerli bir bağlantı girin")
    .refine((u) => u.startsWith("https://"), "Bağlantı https olmalı")
    .nullable()
);

export const siteSettingsSchema = z.object({
  // Ana sayfa videosu aynı formda kaydedilir; doğrulaması yukarıdaki şemadan
  // gelir ki kural tek yerde kalsın.
  heroVideoUrl: heroVideoSchema.shape.heroVideoUrl,

  // Marka
  brandName: optionalText(80, "Marka adı"),
  agencyName: optionalText(140, "Acente unvanı"),
  tursabNo: optionalText(40, "TÜRSAB numarası"),

  // İletişim
  phone: optionalText(30, "Telefon"),
  // Yalnızca rakam/+ tutulur: wa.me bağlantısı bu değerden üretiliyor.
  whatsapp: z.preprocess(
    emptyToNull,
    z
      .string()
      .trim()
      .max(30, "WhatsApp numarası çok uzun")
      .regex(/^[\d\s()+-]+$/, "Yalnızca rakam, boşluk, +, -, ( ) kullanın")
      .nullable()
  ),
  email: z.preprocess(
    emptyToNull,
    z.email("Geçerli bir e-posta girin").nullable()
  ),
  address: optionalText(240, "Adres"),
  instagramUrl: optionalUrl,
  facebookUrl: optionalUrl,

  // Ana sayfa metinleri
  heroTitleTr: optionalText(140, "Ana sayfa başlığı"),
  heroTitleEn: optionalText(140, "Ana sayfa başlığı (EN)"),
  heroSubtitleTr: optionalText(280, "Ana sayfa alt başlığı"),
  heroSubtitleEn: optionalText(280, "Ana sayfa alt başlığı (EN)"),

  // SEO — açıklama sınırı arama sonucunda kırpılan uzunluğa yakın tutuldu
  seoTitleTr: optionalText(70, "SEO başlığı"),
  seoTitleEn: optionalText(70, "SEO başlığı (EN)"),
  seoDescriptionTr: optionalText(180, "SEO açıklaması"),
  seoDescriptionEn: optionalText(180, "SEO açıklaması (EN)"),

  // Konfirmasyon belgesi
  confirmationDepositNote: optionalText(800, "Depozito metni"),
  confirmationCheckinNote: optionalText(800, "Giriş/çıkış metni"),
});

export type SiteSettingsInput = z.infer<typeof siteSettingsSchema>;
