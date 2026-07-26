import { z } from "zod";

const slugRe = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const emptyToNull = (v: unknown) => (v === "" || v == null ? null : v);

export const categoryFormSchema = z.object({
  nameTr: z.string().trim().min(2, "Ad gerekli").max(80),
  nameEn: z.string().trim().min(2, "Ad gerekli").max(80),
  slug: z.string().trim().regex(slugRe, "Küçük harf, rakam ve tire"),
  descTr: z.preprocess(emptyToNull, z.string().max(300).nullable()),
  descEn: z.preprocess(emptyToNull, z.string().max(300).nullable()),
  color: z.enum(["sky", "amber", "rose", "emerald", "violet", "teal"]),
  icon: z.string().trim().min(1, "İkon seçin").max(40),
  image: z.preprocess(emptyToNull, z.url().nullable()),
  featuredOnHome: z.coerce.boolean(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const updateCategorySchema = categoryFormSchema.extend({ id: z.uuid() });

export const deleteCategorySchema = z.object({ id: z.uuid() });

export const setCategoryVillasSchema = z.object({
  categoryId: z.uuid(),
  villaIds: z.array(z.uuid()).max(500),
});
