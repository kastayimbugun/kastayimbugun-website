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
