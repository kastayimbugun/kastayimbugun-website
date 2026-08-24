import { z } from "zod";

/**
 * Villa sahibi başvuru formu şemaları.
 *
 * ARCHITECTURE.md §3: güvenlik kararı her zaman sunucuda verilir; istemci
 * doğrulaması yalnızca UX içindir. Bu yüzden şema saf ve import'suz tutulur.
 *
 * NOT: villa özelliklerinin ("kaç oda", "havuz var mı" ...) cevapları burada
 * DEĞİL, action içinde aktif sorulara göre doğrulanır — sorular panelden
 * yönetildiği için anahtarlar dinamiktir (bkz. actions/villaApplication.ts).
 */

// Telefon için gevşek biçim (booking.ts ile aynı): rakam, boşluk, +, -, parantez.
const phoneChars = /^[\d\s()+-]+$/;

/** Herkese açık formun sabit çekirdek alanları. */
export const applicationCoreSchema = z.object({
  ownerName: z
    .string()
    .trim()
    .min(2, "Ad soyad en az 2 karakter olmalı")
    .max(120, "Ad soyad çok uzun"),

  phone: z
    .string()
    .trim()
    .min(7, "Telefon numarası eksik")
    .max(20, "Telefon numarası çok uzun")
    .regex(phoneChars, "Telefon numarası geçersiz karakter içeriyor"),

  email: z
    .union([z.email("Geçerli bir e-posta girin"), z.literal("")])
    .optional(),

  villaName: z
    .string()
    .trim()
    .min(2, "Villa adı en az 2 karakter olmalı")
    .max(160, "Villa adı çok uzun"),

  location: z
    .string()
    .trim()
    .min(2, "Konum girin (il / ilçe / bölge)")
    .max(200, "Konum çok uzun"),

  address: z.string().trim().max(400, "Adres çok uzun").optional(),

  description: z.string().trim().max(4000, "Açıklama çok uzun").optional(),

  // Başvuranın sitede kullandığı dil (yalnızca gelecekte ona giden e-postayı etkiler).
  lang: z.enum(["tr", "en"]).optional(),
});

export type ApplicationCoreInput = z.infer<typeof applicationCoreSchema>;

/* ---------------------------------------------------------------- durumlar */

export const applicationStatusSchema = z.enum([
  "new",
  "contacted",
  "accepted",
  "rejected",
  "archived",
]);

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

// Panel tek dilli — kullanıcıya görünen Türkçe etiketler.
export const applicationStatusLabel: Record<ApplicationStatus, string> = {
  new: "Yeni",
  contacted: "Görüşüldü",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  archived: "Arşiv",
};

export const updateApplicationStatusSchema = z.object({
  id: z.uuid(),
  status: applicationStatusSchema,
});

export const applicationNoteSchema = z.object({
  id: z.uuid(),
  adminNote: z
    .string()
    .trim()
    .max(2000, "Not en fazla 2000 karakter")
    .optional()
    .transform((v) => (v ? v : null)),
});

export const archiveApplicationSchema = z.object({
  id: z.uuid(),
});

/* ------------------------------------------------------- liste (panel URL) */

export const applicationQuerySchema = z.object({
  durum: applicationStatusSchema.optional().catch(undefined),
  q: z.string().trim().max(60).optional().catch(undefined),
  sayfa: z.coerce.number().int().min(1).max(9999).optional().catch(undefined),
});

export type ApplicationQuery = z.infer<typeof applicationQuerySchema>;

/* -------------------------------------------------- dinamik soru yönetimi */

export const questionTypeSchema = z.enum([
  "text",
  "textarea",
  "number",
  "boolean",
  "select",
]);

export type QuestionType = z.infer<typeof questionTypeSchema>;

export const questionTypeLabel: Record<QuestionType, string> = {
  text: "Kısa metin",
  textarea: "Uzun metin",
  number: "Sayı",
  boolean: "Evet / Hayır",
  select: "Seçenekli",
};

const optionSchema = z.object({
  value: z
    .string()
    .trim()
    .min(1, "Değer gerekli")
    .max(60)
    .regex(/^[a-z0-9_-]+$/, "Küçük harf, rakam, tire/alt çizgi"),
  labelTr: z.string().trim().min(1, "Etiket gerekli").max(80),
  labelEn: z.string().trim().min(1, "Etiket gerekli").max(80),
});

/** Yeni soru / soru düzenleme ortak alanları. */
const questionFields = {
  qkey: z
    .string()
    .trim()
    .min(2, "Anahtar en az 2 karakter")
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Yalnızca küçük harf, rakam ve alt çizgi"),
  labelTr: z.string().trim().min(2, "Türkçe etiket gerekli").max(160),
  labelEn: z.string().trim().min(2, "İngilizce etiket gerekli").max(160),
  helpTr: z.string().trim().max(300).optional().transform((v) => (v ? v : null)),
  helpEn: z.string().trim().max(300).optional().transform((v) => (v ? v : null)),
  type: questionTypeSchema,
  options: z.array(optionSchema).max(30).default([]),
  required: z.coerce.boolean(),
  active: z.coerce.boolean(),
};

// select tipi için en az bir seçenek zorunlu — hem burada hem düzenlemede.
const requireOptionsForSelect = (d: { type: QuestionType; options: unknown[] }) =>
  d.type !== "select" || d.options.length >= 1;
const selectOptionsMessage = {
  message: "Seçenekli soru için en az bir seçenek ekleyin",
  path: ["options"] as PropertyKey[],
};

export const createQuestionSchema = z
  .object(questionFields)
  .refine(requireOptionsForSelect, selectOptionsMessage);

export const updateQuestionSchema = z
  .object({ ...questionFields, id: z.uuid() })
  // qkey düzenlemede değiştirilemez (cevaplar buna bağlı) — action yok sayar,
  // ama şema yine de kabul eder.
  .refine(requireOptionsForSelect, selectOptionsMessage);

export const reorderQuestionSchema = z.object({
  id: z.uuid(),
  direction: z.enum(["up", "down"]),
});

export const toggleQuestionSchema = z.object({
  id: z.uuid(),
  active: z.coerce.boolean(),
});

export const deleteQuestionSchema = z.object({
  id: z.uuid(),
});
