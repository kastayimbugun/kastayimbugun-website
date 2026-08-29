import HomeClient from "@/components/HomeClient";
import { getVillaCards, getRegions } from "@/lib/data/villas";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/site";

export const revalidate = 300;

export default async function Home() {
  const [villas, regions, categories, site] = await Promise.all([
    // Ana sayfa yalnızca kart alanlarını kullanıyor; tam villa nesnesi
    // (açıklamalar, sezonlar, bloklar) buraya hiç gelmemeli.
    getVillaCards(),
    getRegions(),
    getCategories(),
    getSiteSettings(),
  ]);

  return (
    <HomeClient
      villas={villas}
      featured={villas.filter((v) => v.featured)}
      regions={regions}
      categories={categories}
      site={site}
    />
  );
}
