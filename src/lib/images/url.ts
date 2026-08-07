/**
 * Storage yolunu tam public URL'ye çevirir.
 *
 * Eski demo kayıtlarında ve elle girilen bölge görsellerinde alan zaten tam URL
 * olabiliyor; o durumda olduğu gibi bırakılır.
 */
export const IMAGE_BUCKET = "villa-images";

// Proje adresi koda gömülmez: ortam değişkeni eksikse sessizce CANLI projeye
// bağlanmak yerine sorunun görülmesi gerekir (ör. ileride açılacak test/staging
// ortamında yanlışlıkla canlı veriye bakmamak için).
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/+$/,
  ""
);

export function imageUrl(path: string): string;
export function imageUrl(path: null | undefined): null;
export function imageUrl(path: string | null | undefined): string | null;
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const cleanPath = path.replace(/^\/+/, "");
  return `${SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${cleanPath}`;
}
