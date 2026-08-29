import "server-only";
import sanitize from "sanitize-html";
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
/**
 * SVG temizleme — BEYAZ liste.
 *
 * Onceki hali kara listeydi (`/<script|<foreignObject|<!ENTITY|\son\w+\s*=|javascript:/i`)
 * ve atlatilabiliyordu: `\son\w+\s*=` deseni oznitelik onunde BOSLUK istedigi
 * icin `<svg/onload=alert(1)>` filtreden geciyordu; `javascript:` duz metin
 * arandigi icin `&#106;avascript:` gibi entity kodlamalari yakalanmiyordu;
 * `<animate>`, `<set attributeName="href">`, `<use href="data:...">` listede hic
 * yoktu. Yuklenen SVG public bucket'ta duruyor ve ham Storage URL'si tarayicida
 * acildiginda script CALISIR — yani kendi supabase.co origin'imizde depolanmis XSS.
 *
 * Beyaz listede yalnizca cizim etiketleri var; `allowedSchemes: []` ile hicbir
 * URL semasina izin verilmiyor, boylece `href`/`xlink:href` tumuyle dusuyor.
 */
const SVG_SANITIZE: sanitize.IOptions = {
  allowedTags: [
    "svg", "g", "path", "circle", "ellipse", "rect", "line", "polyline",
    "polygon", "defs", "linearGradient", "radialGradient", "stop", "title",
    "desc", "clipPath", "mask",
  ],
  allowedAttributes: {
    "*": [
      "d", "fill", "fill-rule", "fill-opacity", "stroke", "stroke-width",
      "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "stroke-opacity",
      "viewBox", "xmlns", "width", "height", "cx", "cy", "r", "rx", "ry",
      "x", "y", "x1", "y1", "x2", "y2", "points", "transform", "opacity",
      "offset", "stop-color", "stop-opacity", "clip-rule", "clip-path",
      "gradientUnits", "gradientTransform", "id",
    ],
  },
  allowedSchemes: [],
  parser: { lowerCaseTags: true, lowerCaseAttributeNames: true },
};

export async function storeImage(
  supabase: SupabaseClient,
  file: unknown,
  pathBase: string,
  animated = false
): Promise<StoreResult> {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "validation" };
  }
  if (!file.type.startsWith("image/")) return { ok: false, error: "type" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "toobig" };

  // SVG'yi sharp'a sokma (vektör kaybolur). Tehlikeli içerik taşıyorsa reddet,
  // temizse ham sakla — reklam/rozet logoları (TÜRSAB, ödeme ikonları) için.
  const isSvg =
    file.type === "image/svg+xml" ||
    file.name.toLowerCase().endsWith(".svg");
  if (isSvg) {
    const raw = await file.text();
    const clean = sanitize(raw, SVG_SANITIZE);
    // Temizlikten sonra <svg> kokü kalmadiysa dosya gercek bir vektor degil.
    if (!clean.includes("<svg")) return { ok: false, error: "type" };
    const path = `${pathBase}-${Date.now().toString(36)}.svg`;
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, Buffer.from(clean, "utf8"), {
        contentType: "image/svg+xml",
        upsert: true,
      });
    if (error) return { ok: false, error: "generic" };
    return { ok: true, path, width: 0, height: 0 };
  }

  const processed = await processImage(file, undefined, animated);
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
