import { z } from "zod";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const emptyToNull = (v: unknown) => (v === "" || v == null ? null : v);

/** Bölge ekleme/düzenleme. */
export const regionFormSchema = z.object({
  name: z.string().trim().min(2, "Ad en az 2 karakter").max(80),
  province: z.string().trim().min(2, "İl gerekli").max(80),
  slug: z.string().trim().regex(slugRe, "Küçük harf, rakam ve tire"),
  heroImage: z.preprocess(emptyToNull, z.url().nullable()),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export type RegionFormInput = z.infer<typeof regionFormSchema>;

export const updateRegionSchema = regionFormSchema.extend({ id: z.uuid() });

export const deleteRegionSchema = z.object({ id: z.uuid() });
