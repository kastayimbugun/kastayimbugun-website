import type { Metadata } from "next";
import VillaListPage, { buildListMetadata } from "@/components/VillaListPage";

export const revalidate = 300;

type Props = {
  params: Promise<{ city: string; region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * İki segmentli bölge yolu (ör. `/villalar/antalya/kas`).
 *
 * En derin segment bölgeyi belirler ama ÜST SEGMENT DE doğrulanır: ikisi de
 * `resolveRegion`'a geçer. Eskiden yalnızca `region` geçiriliyordu, bu yüzden
 * `/villalar/zzzz/kalkan` gibi uydurma üst segmentli yollar 200 dönüyor ve her
 * biri ayrı bir indekslenebilir kopya oluyordu; artık 404.
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city, region } = await params;
  return buildListMetadata({ locationSegments: [city, region], searchParams });
}

export default async function RegionPage({ params, searchParams }: Props) {
  const { city, region } = await params;
  return (
    <VillaListPage searchParams={searchParams} locationSegments={[city, region]} />
  );
}
