import HomeClient from "@/components/HomeClient";
import { getVillas, getRegions } from "@/lib/data/villas";
import { getCategories } from "@/lib/data/categories";

export const revalidate = 300;

export default async function Home() {
  const [villas, regions, categories] = await Promise.all([
    getVillas(),
    getRegions(),
    getCategories(),
  ]);

  return (
    <HomeClient
      villas={villas}
      featured={villas.filter((v) => v.featured)}
      regions={regions}
      categories={categories}
    />
  );
}
