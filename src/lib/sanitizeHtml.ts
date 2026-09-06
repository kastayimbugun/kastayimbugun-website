import sanitize from "sanitize-html";

/**
 * Zengin metin editöründen gelen HTML'i güvenli hale getirir.
 *
 * ARCHITECTURE.md §5: `dangerouslySetInnerHTML` kullanılmaz; zorunluysa önce
 * sanitize edilir. Sayfa içerikleri (pages.content_tr/en) HTML olarak saklanıp
 * herkese açık sitede basıldığı için burası zorunlu geçiş noktası:
 * `<script>`, olay öznitelikleri (onclick…) ve `javascript:` bağlantıları
 * içeriye girse bile ziyaretçide çalışamaz.
 *
 * İzin listesi bilerek dar: RichTextEditor'ın ürettiği etiketler + temel
 * biçimlendirme. Yeni bir etiket gerektiğinde buraya eklenir.
 */
const OPTIONS: sanitize.IOptions = {
  allowedTags: [
    "p", "br", "hr",
    "h1", "h2", "h3", "h4",
    "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li",
    "blockquote", "code", "pre",
    "a", "span", "div",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    // Editör hizalama/renk için stil bırakıyor; yalnızca güvenli olanlar.
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      "text-align": [/^left$|^right$|^center$|^justify$/],
      "font-weight": [/^bold$|^normal$|^\d{3}$/],
      "font-style": [/^italic$|^normal$/],
      "text-decoration": [/^underline$|^line-through$|^none$/],
    },
  },
  // javascript:, data: gibi şemalar dışarıda kalır.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  transformTags: {
    /**
     * Panelden gelen `<h1>` `<h2>`ye indirilir.
     *
     * Sayfanın `<h1>`'i şablonun işidir; içerik editöründen gelen başlıklar
     * onun ALTINDA yer almalı. `kiralama-kosullari` içeriği eski siteden
     * yapıştırıldığı için kendi bölüm başlıklarını `<h1>` yazıyordu ve sayfa
     * **22 adet `<h1>`** basıyordu — arama motoru için sayfanın konusu
     * belirsiz hâle geliyor.
     *
     * Düzeltme render sırasında değil BURADA yapılıyor: KVKK, Gizlilik ve
     * Mesafeli Satış metinleri de aynı yoldan yapıştırılacak; tek tek sayfa
     * bileşenlerinde düzeltmek aynı hatayı her yeni sayfada tekrar ederdi.
     * Editörden `h1` seçeneğini kaldırmak da tamamlayıcı bir adım, ama bu
     * kural ZATEN KAYITLI içeriği de düzeltir.
     */
    h1: "h2",
    // Dış bağlantılar yeni sekmede açılırken opener sızıntısı olmasın.
    a: (tagName, attribs) => ({
      tagName,
      attribs: {
        ...attribs,
        ...(attribs.target === "_blank"
          ? { rel: "noopener noreferrer" }
          : {}),
      },
    }),
  },
};

export function sanitizeRichText(html: string | null | undefined): string {
  if (!html) return "";
  return sanitize(html, OPTIONS);
}
