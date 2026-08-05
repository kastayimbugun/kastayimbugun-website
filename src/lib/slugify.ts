/**
 * Türkçe metinden URL kısa adı (slug) üretir.
 *
 * Tek kaynak: villa, kategori ve bölge formları bunu kullanır — üç ayrı kopya
 * tutmak, birinde düzeltilen hatanın diğerlerinde kalmasına yol açıyordu
 * (docs/panel-kurallari.md §5, "DRY / tasarım sistemi").
 *
 * `İ` özel olarak ele alınır: JS'te "İ".toLowerCase() sonucu "i" + birleşen
 * nokta (U+0307) olduğu için sadeleştirmeden geçirilmezse "İzmir" → "i-zmir"
 * gibi bozuk çıktılar üretir.
 */
export function slugify(input: string): string {
  return (
    input
      .replace(/İ/g, "i")
      .replace(/I/g, "i")
      .toLowerCase()
      .replace(/ı/g, "i")
      .replace(/ş/g, "s")
      .replace(/ğ/g, "g")
      .replace(/ü/g, "u")
      .replace(/ö/g, "o")
      .replace(/ç/g, "c")
      // kalan aksanlı harfleri (é, â, î…) taban harfe indir
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
  );
}
