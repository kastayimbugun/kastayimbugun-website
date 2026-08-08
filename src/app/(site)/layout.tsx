import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRegions } from "@/lib/data/villas";
import { getFooterPages } from "@/lib/data/pages";
import { getSiteSettings } from "@/lib/data/site";

/**
 * Herkese açık sitenin kabuğu: header + footer + içerik.
 * Yönetim paneli (/yonetim) bu grubun DIŞINDA olduğu için bu kabuğu almaz.
 */
export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [regions, footerPages, site] = await Promise.all([
    getRegions(),
    getFooterPages(),
    getSiteSettings(),
  ]);

  return (
    <>
      <Header config={site.headerConfig} />
      <main className="flex-1">{children}</main>
      <Footer
        regions={regions}
        footerPages={footerPages}
        config={site.footerConfig}
      />
    </>
  );
}
