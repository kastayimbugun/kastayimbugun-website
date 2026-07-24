import { Suspense } from "react";
import VillaListClient from "@/components/VillaListClient";
import { getVillas, getRegions } from "@/lib/data/villas";
import { getCategories } from "@/lib/data/categories";

export const revalidate = 300;

export default async function VillalarPage() {
  const [villas, regions, categories] = await Promise.all([
    getVillas(),
    getRegions(),
    getCategories(),
  ]);

  return (
    <Suspense fallback={<div className="min-h-[60vh]" />}>
      <VillaListClient
        villas={villas}
        regions={regions}
        categories={categories}
      />
    </Suspense>
  );
}
