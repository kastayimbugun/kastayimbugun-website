import { z } from "zod";

export const pageSchema = z.object({
  slug: z
    .string()
    .min(2, "URL uzantısı en az 2 karakter olmalıdır")
    .max(100, "URL uzantısı en fazla 100 karakter olabilir")
    .regex(/^[a-z0-9-]+$/, "URL uzantısı sadece küçük harf, rakam ve tire (-) içerebilir"),
  titleTr: z.string().min(2, "Türkçe başlık en az 2 karakter olmalıdır"),
  // İngilizce başlık isteğe bağlı — boşsa kayıtta Türkçe başlığa düşülür.
  titleEn: z.string().optional().default(""),
  contentTr: z.string().optional().default(""),
  contentEn: z.string().optional().default(""),
  metaTitleTr: z.string().optional(),
  metaTitleEn: z.string().optional(),
  metaDescriptionTr: z.string().optional(),
  metaDescriptionEn: z.string().optional(),
  status: z.enum(["draft", "published"]),
  showInFooter: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export type PageSchemaInput = z.infer<typeof pageSchema>;
