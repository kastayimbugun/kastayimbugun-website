/**
 * SEO metinleri için ortak düz-metin yardımcıları.
 *
 * Neden ayrı dosya: bu işi yapan İKİ ayrı uygulama vardı ve ikisi farklı
 * davranıyordu. `jsonLd.ts` içindeki `<[^>]*>` regex'i varlıkları hiç
 * çözmüyordu, bu yüzden JSON-LD'de villa adı `Villa Sül&amp;amp;Sar 1` olarak
 * çıkıyordu (JSON dizesinin İÇİNDE ham `&amp;` — öznitelik kaçışı değil, yani
 * Google adı gerçekten böyle okuyordu). Villa sayfasındaki uygulama doğruydu.
 *
 * Ölçüldü: `/villa/villa-sulsar1` JSON-LD'sinde `name` doğru (`Villa Sül&Sar 1`)
 * ama `description` bozuktu — aynı sayfada iki farklı sonuç. Tek kaynağa
 * indirildi.
 *
 * `sanitize-html` Node tarafı bir paket. Bu modül yalnızca sunucu bileşenlerinden
 * ve `generateMetadata`'dan çağrılır; istemci paketine sokmayın.
 */
import sanitize from "sanitize-html";

/**
 * Zengin metni düz metne indirger.
 *
 * Açıklamalar panelde zengin metin editöründen giriliyor, yani HTML içerebilir;
 * meta açıklamaya ve yapılandırılmış veriye ham etiket girmemeli. Etiketler
 * KENDİ regex'imizle değil `sanitize-html` ile sökülüyor çünkü `<[^>]*>`
 * biçiminde bir regex `<script>` GÖVDESİNİ metin olarak bırakır, `title="a>b"`
 * gibi bir öznitelikte yanlış yerde keser ve `&nbsp;`/`&#39;` gibi varlıkları
 * hiç çözmez. `allowedTags: []` üçünü de doğru yapar.
 */
export function plainText(html: string | null | undefined): string {
  if (!html) return "";

  // Etiket sınırlarına önce boşluk konur. sanitize-html etiketi silerken yerine
  // HİÇBİR ŞEY koymuyor: `<h2>Villa Deniz</h2><p>Kalkan'da…` düz metne
  // "Villa DenizKalkan'da…" olarak iniyor, yani iki kelime birbirine yapışıyor.
  // İşaretleme ayrıştırmadan ÖNCE yapıldığı için ayrıştırmayı bozmaz: `<` ya
  // etiket başlangıcıdır (önüne boşluk zararsız) ya da zaten düz metindir.
  const stripped = sanitize(html.replace(/</g, " <"), {
    allowedTags: [],
    allowedAttributes: {},
  });

  // sanitize-html çıkan METİNDEKİ `&`, `<`, `>`, `"` karakterlerini yeniden
  // kaçırır; metinde `&amp;` görünmesin diye geri çözülür. `&amp;` EN SONDA:
  // önce çözülürse `&amp;lt;` yanlışlıkla `<` olur.
  const decoded = stripped
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

  // `\s` kırılmaz boşluğu (`&nbsp;` →  ) da kapsar, tek boşluğa iner.
  return decoded.replace(/\s+/g, " ").trim();
}

/** Sınırı aşan metni kelimeyi ortadan bölmeden kırpar. */
export function clamp(value: string, max: number): string {
  if (value.length <= max) return value;
  const cut = value.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  // Son boşluk çok başta kaldıysa (tek uzun sözcük) olduğu yerden kesilir.
  const base = lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base.replace(/[\s.,;:!?-]+$/, "")}…`;
}

/** Düz metne indirger ve gerekiyorsa kırpar; boşsa `null`. */
export function plainTextClamped(
  html: string | null | undefined,
  max: number
): string | null {
  const text = plainText(html);
  return text ? clamp(text, max) : null;
}
