/**
 * Storage yolunu tam public URL'ye çevirir.
 *
 * Eski demo kayıtlarında ve elle girilen bölge görsellerinde alan zaten tam URL
 * olabiliyor; o durumda olduğu gibi bırakılır.
 */
export const IMAGE_BUCKET = "villa-images";

export function imageUrl(path: string): string;
export function imageUrl(path: null | undefined): null;
export function imageUrl(path: string | null | undefined): string | null;
export function imageUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${IMAGE_BUCKET}/${path}`;
}
