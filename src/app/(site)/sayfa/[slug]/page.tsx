import React from "react";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPageBySlug, getAllPublishedPageSlugs } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/site";
import { SITE_URL_UNUSABLE, absoluteUrl } from "@/lib/seo/urls";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";

interface PublicPageProps {
  params: Promise<{ slug: string }>;
}

/** İçerik sayfalarının kanonik kökü. Yol biçimi tek yerde durur. */
const CONTENT_PATH = "/sayfa";

/** `/sayfa/<slug>` — slug DB'den gelir, URL'den değil (kanonik biçim odur). */
function contentPath(slug: string): string {
  return `${CONTENT_PATH}/${encodeURIComponent(slug)}`;
}

/**
 * Kanonik adres — kurallar `src/app/(site)/villa/[slug]/page.tsx` ile birebir
 * aynı, bilerek kopyalandı ki iki sayfa farklı davranmasın.
 *
 * `urls.ts`'teki açık uyarı: `NEXT_PUBLIC_SITE_URL` üretimde localhost kalırsa
 * buradan localhost döner. Canonical bir tavsiye değil YÖNERGEDİR; Google'ın
 * erişemediği bir adresi göstermek sayfayı indeksten düşürebilir. Böyle bir
 * üretim derlemesinde alan hiç basılmaz (Google o zaman sayfayı kendine
 * canonical sayar — doğru davranış). Geliştirmede basılır ki doğrulanabilsin.
 */
function canonicalUrl(slug: string): string | null {
  if (SITE_URL_UNUSABLE) return null;
  return absoluteUrl(contentPath(slug));
}

/**
 * İçerikteki `<h1>` etiketlerini `<h2>`'ye indirir.
 *
 * NEDEN: sayfanın kendi başlığı (`page.titleTr`) zaten `<h1>`. Panelden gelen
 * zengin metin eski siteden yapıştırıldığı için kendi bölüm başlıklarını da
 * `<h1>` yazıyor — `/sayfa/kiralama-kosullari` bu düzeltmeden önce TEK sayfada
 * 22 adet `<h1>` basıyordu. Sonuç: arama motoru için sayfanın konusu
 * belirsizleşir, ekran okuyucuda başlık ağacı düzleşir (H1 → H2 → H3 basamağı
 * kalmaz). Metin aynen kalır, yalnızca düzey iner; `prose-h2:` sınıfları zaten
 * bu düzeyi biçimlendiriyor.
 *
 * Regex GÜVENLİ çünkü girdi `sanitizeRichText()` ÇIKTISI: sanitize-html metin
 * ve öznitelik değerlerindeki `<`/`>` karakterlerini kaçırır, yani kalan her
 * `<h1` gerçek bir etiketin başlangıcıdır. Sıra da bu yüzden önemli —
 * indirgeme sanitize'dan SONRA yapılır.
 *
 * Kalıcı çözüm bu dosyanın DIŞINDA: `src/lib/sanitizeHtml.ts` içindeki
 * `transformTags` ile (`h1 → h2`) ya da panelin editöründen H1 seçeneğini
 * kaldırarak. İkisi de başka bir ajanın dosyası; rapora yazıldı.
 */
function demoteContentHeadings(html: string): string {
  return html
    .replace(/<h1(\s[^>]*)?>/gi, "<h2$1>")
    .replace(/<\/h1\s*>/gi, "</h2>");
}

export async function generateStaticParams() {
  const slugs = await getAllPublishedPageSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PublicPageProps): Promise<Metadata> {
  const { slug } = await params;
  // `getSiteSettings()` React `cache()` ile sarılı; düzen zaten çağırdığı için
  // istek başına ek sorgu doğmaz.
  const [page, site] = await Promise.all([getPageBySlug(slug), getSiteSettings()]);

  if (!page) {
    // Sayfa yoksa render tarafı `notFound()` çağırıyor ve Next `not-found.tsx`
    // metadata'sını basıyor; burası yalnızca ara durumu tutarlı bırakır.
    return { title: "Sayfa Bulunamadı" };
  }

  const brand = site.brandName?.trim() || "Kastayım Bugün Villaları";

  /**
   * Başlığa marka EKLENMEZ: kök düzen `title.template` ile `— <marka>` ekini
   * kendisi basıyor. Buradaki eski `| Kastayım Bugün` eki bu yüzden kaldırıldı;
   * çıktı "Kiralama Koşulları | Kastayım Bugün — Kastayım Bugün Villaları"
   * oluyordu — marka iki kez.
   *
   * Panelin `metaTitleTr` alanı yine öncelikli ama o da şablondan geçer:
   * markanın bazı sayfalarda olup bazılarında olmaması, alanı dolduran kişinin
   * markayı elle yazıp yazmadığına bağlı kalmasın.
   */
  const title = page.metaTitleTr?.trim() || page.titleTr;
  const description =
    page.metaDescriptionTr?.trim() ||
    `${page.titleTr} — ${brand} kiralama ve konaklama bilgileri.`;

  const canonical = canonicalUrl(page.slug);

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    // DİKKAT: metadata sığ birleşir — bu alan yazıldığı an kök düzenin
    // `openGraph` bloğunun TAMAMI düşer. `type`/`locale`/`siteName` bu yüzden
    // burada yeniden veriliyor.
    openGraph: {
      type: "article",
      locale: "tr_TR",
      siteName: brand,
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
    },
    twitter: {
      // Bu sayfaların kendine ait bir görseli yok; büyük görsel kartı sözü
      // vermenin anlamı yok.
      card: "summary",
      title,
      description,
    },
  };
}

export default async function PublicDynamicPage({ params }: PublicPageProps) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);

  /**
   * TASLAK/ARŞİV SAYFA SIZINTISI YOK — iki katman birden kapatıyor:
   *  1. `getPageBySlug()` sorgusu `.eq("status", "published")` filtresini
   *     taşıyor, yani taslak satır hiç dönmez → burada `null` → 404.
   *  2. RLS politikası (`0010_pages_rls_fix.sql`): anon rol yalnızca
   *     `status = 'published'` satırları okuyabilir. Uygulama filtresi
   *     unutulsa bile veritabanı taslağı vermez.
   * Ayrıca `generateStaticParams()` yalnızca yayınlanmış slug'ları üretir ve
   * panel her yazma sonrası `revalidatePath("/sayfa/[slug]", "page")` çağırır —
   * yayından kaldırılan bir sayfa önbellekte asılı kalmaz.
   */
  if (!page) {
    notFound();
  }

  const content = demoteContentHeadings(sanitizeRichText(page.contentTr));

  return (
    <div className="bg-sand-50/50 min-h-screen py-10 md:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Ekmek Kırıntısı (Breadcrumbs) */}
        <nav className="flex items-center gap-2 text-xs text-gray-500 mb-6">
          <Link href="/" className="hover:text-emerald-700 transition">
            Ana Sayfa
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-800 font-medium truncate">{page.titleTr}</span>
        </nav>

        {/* Sayfa Kartı */}
        <article className="bg-white rounded-2xl p-6 sm:p-10 shadow-sm border border-sand-200">
          {/* Sayfa Başlığı */}
          <header className="border-b border-sand-200 pb-6 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full mb-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Kurumsal & Yasal Metin
            </div>
            {/* Sayfanın TEK `<h1>`'i. İçerikten gelenler h2'ye indirildi. */}
            <h1 className="text-2xl sm:text-4xl font-extrabold text-brand-950 tracking-tight">
              {page.titleTr}
            </h1>
            <p className="text-xs text-gray-400 mt-2">
              Son güncelleme: {new Date(page.updatedAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </header>

          {/* Sayfa İçeriği (WordPress Rich Text HTML Render) */}
          <div
            className="prose prose-slate max-w-none text-gray-800 leading-relaxed
              prose-headings:font-bold prose-headings:text-brand-950
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:pb-2
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3
              prose-a:text-emerald-700 prose-a:underline hover:prose-a:text-emerald-800
              prose-ul:list-disc prose-ul:pl-6 prose-ol:list-decimal prose-ol:pl-6
              prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:bg-sand-50 prose-blockquote:py-2
              prose-table:w-full prose-table:border-collapse prose-table:my-6
              prose-th:bg-sand-100 prose-th:p-3 prose-th:text-left prose-th:border prose-th:border-sand-200
              prose-td:p-3 prose-td:border prose-td:border-sand-200"
            // İçerik panelden HTML olarak geliyor; ziyaretçiye basmadan önce
            // sanitize ediliyor (ARCHITECTURE.md §5), ardından başlık düzeyi
            // düşürülüyor (yukarıdaki `demoteContentHeadings`).
            dangerouslySetInnerHTML={{
              __html: content || "<p>İçerik henüz eklenmedi.</p>",
            }}
          />
        </article>
      </div>
    </div>
  );
}
