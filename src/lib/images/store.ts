import "server-only";
import { processImage } from "@/lib/images/process";
import { MAX_UPLOAD_BYTES } from "@/lib/images/limits";
import { IMAGE_BUCKET } from "@/lib/images/url";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StoreError = "validation" | "toobig" | "type" | "generic";

export type StoreResult =
  | { ok: true; path: string; width: number; height: number }
  | { ok: false; error: StoreError };

/**
 * Tek bir görseli işleyip Storage'a yazar (bölge kartı, site hero'su gibi
 * tekil görseller için). Villa galerisi kendi sıralama/DB mantığıyla
 * `actions/admin/images.ts` içinde ayrı yürür.
 *
 * `pathBase` uzantısız verilir; dosya adına sürüm damgası eklenir ki
 * CDN eski görseli göstermeye devam etmesin.
 *
 * GÜVENLİK: yetkiyi ÇAĞIRAN action doğrular — bu yardımcı kontrol yapmaz.
 */
export async function storeImage(
  supabase: SupabaseClient,
  file: unknown,
  pathBase: string
): Promise<StoreResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "validation" };
  }
  if (!file.type.startsWith("image/")) return { ok: false, error: "type" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "toobig" };

  const processed = await processImage(file);
  if (!processed) return { ok: false, error: "type" };

  const path = `${pathBase}-${Date.now().toString(36)}.${processed.ext}`;
  const { error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, processed.buffer, {
      contentType: processed.contentType,
      upsert: true,
    });
  if (error) return { ok: false, error: "generic" };

  return {
    ok: true,
    path,
    width: processed.width,
    height: processed.height,
  };
}

/** Storage'daki dosyayı siler. Tam URL (eski demo verisi) ise dokunmaz. */
export async function removeImage(
  supabase: SupabaseClient,
  path: string | null | undefined
) {
  if (!path || path.startsWith("http")) return;
  await supabase.storage.from(IMAGE_BUCKET).remove([path]);
}
