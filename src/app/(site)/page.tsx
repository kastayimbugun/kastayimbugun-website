import HomeClient from "@/components/HomeClient";
import {
  getRegions,
  getRegionVillaCounts,
  getFeaturedVillaCards,
  getVillaCardsBySlugs,
  getVillaFacetCounts,
} from "@/lib/data/villas";
import { getCategories } from "@/lib/data/categories";
import { getSiteSettings } from "@/lib/data/site";

export const revalidate = 300;

/** Ana sayfadaki bir kategori satırında en fazla kaç villa gösterilir. */
const PER_CATEGORY = 12;

export default async function Home() {
  // Ana sayfa artık TÜM katalogu çekmiyor.
  //
  // Eskiden `getVillaCards()` ile bütün yayınlanmış villalar geliyordu ve
  // PostgREST 1.000 satırda **sessizce kırpıyor** (ölçüldü: 1.102 satırlık
  // tabloda sorgu 1.000 döndürdü, hata vermedi). Yani katalog 1.000'i geçtiği
  // an ana sayfa eksik veri göstermeye başlar ve hiçbir uyarı çıkmaz.
  //
  // Şimdi her ihtiyaç kendi sınırlı sorgusunda:
  //   · bölge sayaçları → Postgres sayıyor, dönen satır = bölge sayısı
  //   · öne çıkanlar    → SQL'de filtreli + limitli
  //   · kategori satırları → yalnızca gösterilecek slug'lar
  //   · rozet/kutucuk sayaçları → Postgres sayıyor, satır hiç dönmüyor
  const [regions, categories, site, regionCounts, featured, counts] =
    await Promise.all([
      getRegions(),
      getCategories(),
      getSiteSettings(),
      getRegionVillaCounts(),
      getFeaturedVillaCards(PER_CATEGORY),
      getVillaFacetCounts(),
    ]);

  // Ana sayfada gösterilecek kategorilerin villalarını tek sorguda topla.
  const categorySlugs = categories
    .filter((c) => c.featuredOnHome)
    .flatMap((c) => c.villaSlugs.slice(0, PER_CATEGORY));
  const categoryVillas = await getVillaCardsBySlugs(categorySlugs);

  return (
    <HomeClient
      featured={featured}
      categoryVillas={categoryVillas}
      regionCounts={Object.fromEntries(regionCounts)}
      regions={regions}
      categories={categories}
      site={site}
      counts={counts}
    />
  );
}
