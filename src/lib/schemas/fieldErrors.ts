import type { ZodError } from "zod";

/**
 * Zod hatalarını "alan adı → mesaj" sözlüğüne çevirir.
 *
 * Şemalarda alan bazlı Türkçe mesajlar zaten yazılıydı ("Bölge seçin",
 * "SS:DD biçiminde", "Küçük harf, rakam ve tire") ama action'lar
 * `parsed.error`'ı atıp istemciye tek bir "Bilgileri kontrol edin" cümlesi
 * döndürdüğü için ölü koddu. Bu yardımcı, mesajları forma taşır
 * (docs/panel-kurallari.md §4: "hata mesajları alan altında satır içi").
 *
 * Alan başına ilk hata yeterli — kullanıcıya aynı alan için üst üste üç
 * mesaj göstermenin faydası yok.
 */
export function toFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in out)) {
      out[key] = issue.message;
    }
  }
  return out;
}
