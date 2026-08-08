import { z } from "zod";

/**
 * Toplu güncelleme şemaları (yol haritası 3.3).
 * "1–31 Ağustos, seçili 6 villa → fiyat X / min. gece 7 / kapat-aç".
 *
 * Sunucu tarafı sınır: en fazla 200 villa tek seferde — kazara "hepsini seç"
 * ile devasa bir yazma tetiklenmesin.
 */

const iso = /^\d{4}-\d{2}-\d{2}$/;

const villaIds = z
  .array(z.uuid())
  .min(1, "En az bir villa seçin")
  .max(200, "Tek seferde en fazla 200 villa");

const dateRange = {
  from: z.string().regex(iso, "Geçerli tarih girin"),
  to: z.string().regex(iso, "Geçerli tarih girin"),
};

/** Toplu sezon fiyatı: aralığa değen mevcut sezonlar değiştirilir. */
export const bulkSeasonSchema = z
  .object({
    villaIds,
    ...dateRange,
    price: z.coerce.number().nonnegative("Fiyat negatif olamaz").max(10_000_000),
    // Boş bırakılırsa sezona min. gece yazılmaz (villa varsayılanı geçerli olur).
    minNights: z.preprocess(
      (v) => (v === "" || v == null ? null : v),
      z.coerce.number().int().min(1).max(60).nullable()
    ),
    label: z.string().trim().min(1, "Etiket girin").max(60),
  })
  .refine((d) => d.to > d.from, {
    message: "Bitiş, başlangıçtan sonra olmalı",
    path: ["to"],
  });

export type BulkSeasonInput = z.infer<typeof bulkSeasonSchema>;

/** Toplu müsaitlik: seçili aralığı kapat ya da aç. */
export const bulkAvailabilitySchema = z
  .object({
    villaIds,
    ...dateRange,
    mode: z.enum(["close", "open"]),
    note: z.string().trim().max(200).optional(),
  })
  .refine((d) => d.to > d.from, {
    message: "Bitiş, başlangıçtan sonra olmalı",
    path: ["to"],
  });

export type BulkAvailabilityInput = z.infer<typeof bulkAvailabilitySchema>;
