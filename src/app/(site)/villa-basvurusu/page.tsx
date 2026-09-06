import type { Metadata } from "next";
import { getActiveApplicationQuestions } from "@/lib/data/applicationQuestions";
import { getSiteSettings } from "@/lib/data/site";
import { SITE_URL_UNUSABLE, absoluteUrl } from "@/lib/seo/urls";
import VillaApplicationForm from "@/components/VillaApplicationForm";

// Sorular panelden değişebildiği için sayfa taze render edilir.
export const dynamic = "force-dynamic";

/** Sayfanın kanonik yolu. Tek yerde durur ki metadata ile rota ayrışmasın. */
const APPLICATION_PATH = "/villa-basvurusu";

/**
 * Kanonik adres — kurallar `src/app/(site)/villa/[slug]/page.tsx` ile BİREBİR
 * aynı, bilerek kopyalandı ki iki sayfa farklı davranmasın.
 *
 * `urls.ts`'teki açık uyarı: `NEXT_PUBLIC_SITE_URL` üretimde localhost kalırsa
 * buradan localhost döner. Canonical bir tavsiye değil YÖNERGEDİR; Google'ın
 * erişemediği bir adresi göstermek sayfayı indeksten düşürebilir. Böyle bir
 * üretim derlemesinde alan hiç basılmaz (Google o zaman sayfayı kendine
 * canonical sayar — doğru davranış). Geliştirmede basılır ki doğrulanabilsin.
 */
function canonicalUrl(): string | null {
  if (SITE_URL_UNUSABLE) return null;
  return absoluteUrl(APPLICATION_PATH);
}

/**
 * Bu sayfa TİCARİ bir giriş kapısı: villa sahibi "villamı kiraya vermek
 * istiyorum" diye arattığında bulunması gereken tek sayfa burası. Bu yüzden
 * `noindex` YOK — teşekkür sayfalarının aksine indekslenmeli.
 *
 * Neden sabit `metadata` değil `generateMetadata`: marka adı ve paylaşım
 * görseli panelden (`site_settings`) geliyor, yani metadata dış veriye bağlı.
 * `getSiteSettings()` React `cache()` ile sarılı ve düzen zaten çağırıyor —
 * istek başına ek sorgu doğmuyor.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await getSiteSettings();
  const brand = site.brandName?.trim() || "Kastayım Bugün Villaları";

  /**
   * Başlığa marka EKLENMEZ: kök düzen `title.template` ile `— <marka>` ekini
   * kendisi basıyor. Buraya da yazmak "… — Marka — Marka" üretirdi.
   * Metin ekrandaki `<h1>` (`apply.pageTitle`) ile aynı — arama sonucunda
   * tıklayan kişi aynı başlığı görsün.
   */
  const title = "Villanızı Kiraya Verin";
  const description =
    "Villanızı Kastayım Bugün'de kiraya verin: konum, özellik ve fotoğraflarını paylaşın, ekibimiz değerlendirip sizinle iletişime geçsin.";

  const canonical = canonicalUrl();

  /**
   * Paylaşım görseli yalnızca ZATEN MUTLAK ise basılır (panelden gelen
   * `imageUrl()` çıktısı Supabase Storage adresidir). Göreli bir yol
   * `metadataBase`'e bağımlı olurdu; o alan da site kökü yanlışsa hiç
   * basılmıyor (kök düzenin kararı) — yani göreli yol sessizce kırılabilirdi.
   */
  const rawImage = site.ogImage?.trim() || site.logoImage?.trim() || "";
  const image = /^https?:\/\//i.test(rawImage) ? rawImage : null;

  return {
    title,
    description,
    ...(canonical ? { alternates: { canonical } } : {}),
    // DİKKAT: metadata sığ birleşir — bu alan yazıldığı an kök düzenin
    // `openGraph` bloğunun TAMAMI düşer. Bu yüzden `type`/`locale`/`siteName`
    // burada yeniden veriliyor.
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: brand,
      title,
      description,
      ...(canonical ? { url: canonical } : {}),
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
    },
    twitter: {
      // Görsel yoksa "büyük görsel" kartı sözü vermenin anlamı yok.
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function VillaApplicationPage() {
  const questions = await getActiveApplicationQuestions();
  return <VillaApplicationForm questions={questions} />;
}
