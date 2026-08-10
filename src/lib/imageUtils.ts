/**
 * Next.js <Image> bileşenine geçilmeye uygun geçerli bir URL olup olmadığını denetler.
 * Boş string (""), null, undefined veya geçersiz protokollü metinlerde false döner.
 */
export function isValidImageUrl(url?: string | null): url is string {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;

  if (
    trimmed.startsWith("/") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:")
  ) {
    try {
      new URL(trimmed, "http://localhost");
      return true;
    } catch {
      return false;
    }
  }

  return false;
}
