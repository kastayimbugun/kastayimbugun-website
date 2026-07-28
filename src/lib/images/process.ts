import "server-only";
import sharp, { type OutputInfo } from "sharp";

/**
 * Yüklenen görselleri yayına hazır hale getirir (Faz 3).
 *
 * - Uzun kenar en fazla MAX_EDGE piksel (büyütme yok)
 * - Çıktı WebP; hedef boyutun üstünde kalırsa kalite kademeli düşürülür
 * - EXIF temizlenir: sharp çıktıya metadata kopyalamaz, `.withMetadata()`
 *   çağrılmadığı sürece konum/kamera bilgisi dosyada kalmaz.
 *   `.rotate()` önce yönlendirmeyi piksellere uygular ki görsel ters dönmesin.
 */

export const MAX_EDGE = 2000;
const TARGET_BYTES = 300 * 1024;
const QUALITY_STEPS = [82, 72, 62];

export interface ProcessedImage {
  buffer: Buffer;
  width: number;
  height: number;
  contentType: "image/webp";
  ext: "webp";
}

/** Görsel dosyasını WebP'ye çevirir. Görsel değilse/bozuksa null döner. */
export async function processImage(
  file: File,
  maxEdge = MAX_EDGE
): Promise<ProcessedImage | null> {
  const input = Buffer.from(await file.arrayBuffer());

  let out: { data: Buffer; info: OutputInfo } | null = null;
  for (const quality of QUALITY_STEPS) {
    try {
      out = await sharp(input)
        .rotate()
        .resize({
          width: maxEdge,
          height: maxEdge,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality })
        .toBuffer({ resolveWithObject: true });
    } catch {
      return null; // sharp okuyamadıysa görsel değil
    }
    if (out.data.byteLength <= TARGET_BYTES) break;
  }
  if (!out) return null;

  return {
    buffer: out.data,
    width: out.info.width,
    height: out.info.height,
    contentType: "image/webp",
    ext: "webp",
  };
}
