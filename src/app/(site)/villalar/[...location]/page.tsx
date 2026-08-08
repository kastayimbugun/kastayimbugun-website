import { Suspense } from "react";
import VillaListClient from "@/components/VillaListClient";
import { getVillas, getRegions } from "@/lib/data/villas";
import { getCategories } from "@/lib/data/categories";

export const revalidate = 300;

export default async function DynamicLocationPage({
  params,
}: {
  params: Promise<{ location: string[] }>;
}) {
  const { location } = await params;
  const [villas, regions, categories] = await Promise.all([
    getVillas(),
    getRegions(),
    getCategories(),
  ]);

  const citySlug = location[0];
  const districtSlug = location[1];
  const regionSlug = location[2] || location[1] || location[0];

  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <VillaListClient
        villas={villas}
        regions={regions}
        categories={categories}
        initialCitySlug={citySlug}
        initialRegionSlug={regionSlug}
      />
    </Suspense>
  );
}
