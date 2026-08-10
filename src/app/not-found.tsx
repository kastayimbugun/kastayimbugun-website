import Header from "@/components/Header";
import Footer from "@/components/Footer";
import NotFoundClient from "@/components/NotFoundClient";
import { getRegions } from "@/lib/data/villas";
import { getFooterPages } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/site";

export const metadata = {
  title: "404 — Sayfa Bulunamadı | Kastayım Bugün Villaları",
  description: "Aradığınız sayfa veya villa bulunamadı.",
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
