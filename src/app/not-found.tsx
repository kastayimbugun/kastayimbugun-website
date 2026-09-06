import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotFoundClient from "@/components/NotFoundClient";
import { getRegions } from "@/lib/data/villas";
import { getFooterPages } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/site";

/**
 * 404 metadata'sı.
 *
 * İki hata birden düzeltildi (ikisi de canlı sayfada ölçüldü):
 *
 * 1. Marka adı BURADA yazılıydı, kök düzen de `title.template` ile ekliyordu:
 *    başlık "404 — Sayfa Bulunamadı | Kastayım Bugün Villaları — Kastayım Bugün
 *    Villaları" çıkıyordu. Marka artık yalnızca şablondan geliyor — ayrıca
 *    ARCHITECTURE.md §7 marka adının koda gömülmesini yasaklıyor.
 *
 * 2. Sayfada İKİ ÇELİŞKİLİ robots etiketi vardı: Next'in kendi `noindex`'i ve
 *    kök düzenden gelen `index, follow`. Metadata sığ birleştiği için burada
 *    `robots` yazmak kökün bloğunu tamamen değiştirir ve çelişki biter.
 *    `follow: true`: sayfa dizine girmesin ama üstündeki bağlantılar taransın.
 */
export const metadata = {
  title: "Sayfa Bulunamadı",
  description: "Aradığınız sayfa veya villa bulunamadı.",
  robots: { index: false, follow: true },
};

export default async function GlobalNotFound() {
  const [regions, footerPages, site] = await Promise.all([
    getRegions(),
    getFooterPages(),
    getSiteSettings(),
  ]);

  return (
    <>
      <Header config={site.headerConfig} />
      <main className="flex-1">
        <NotFoundClient />
      </main>
      <Footer
        regions={regions}
        footerPages={footerPages}
        config={site.footerConfig}
      />
    </>
  );
}
