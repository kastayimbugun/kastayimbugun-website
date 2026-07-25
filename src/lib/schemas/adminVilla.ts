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
