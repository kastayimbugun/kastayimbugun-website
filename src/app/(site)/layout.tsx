import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getRegions } from "@/lib/data/villas";
import { getFooterPages } from "@/lib/data/pages";

/**
 * Herkese açık sitenin kabuğu: header + footer + içerik.
 * Yönetim paneli (/yonetim) bu grubun DIŞINDA olduğu için bu kabuğu almaz.
 */
export default async function SiteLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [regions, footerPages] = await Promise.all([
    getRegions(),
    getFooterPages(),
  ]);

  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer regions={regions} footerPages={footerPages} />
    </>
  );
}
