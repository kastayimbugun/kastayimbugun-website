import { z } from "zod";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Bölge ekleme/düzenleme.
 * Kart görseli bu formda değil: Storage'a yüklenir (uploadRegionHero),
 * çünkü artık dışarıdan URL değil kendi bucket'ımızdaki dosya tutuluyor.
 */
export const regionFormSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter").max(80),
  province: z.string().trim().max(80).default(""),
  slug: z.string().trim().regex(slugRe, "Küçük harf, rakam ve tire"),
  sortOrder: z.coerce.number().int().min(0).max(9999),
  /** Üst bölge (şehir) id'si. Boş = şehir seviyesi. */
  parentId: z.string().uuid().nullable().optional().default(null),
});

export type RegionFormInput = z.infer<typeof regionFormSchema>;

export const updateRegionSchema = regionFormSchema.extend({ id: z.uuid() });

export const deleteRegionSchema = z.object({ id: z.uuid() });

/** Bölge kartı görselini yükleme/kaldırma. */
export const regionIdSchema = z.object({ id: z.uuid() });
