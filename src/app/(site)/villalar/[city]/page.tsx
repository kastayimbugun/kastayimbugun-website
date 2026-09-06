import type { Metadata } from "next";
import VillaListPage, { buildListMetadata } from "@/components/VillaListPage";

export const revalidate = 300;

type Props = {
  params: Promise<{ city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Tek segmentli bölge yolu (ör. `/villalar/antalya`).
 *
 * Segment doğrulanmadan kullanılmaz: `/villalar/asdfgh` eskiden 200 dönüp boş
 * liste gösteriyordu, artık 404. Segment DERİN bir bölgeyi gösteriyorsa (ör.
 * `/villalar/cukurbag`) sayfa yine 200 döner ama canonical tam kanonik yolu
 * (`/villalar/antalya/kas/cukurbag`) gösterir.
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city } = await params;
  return buildListMetadata({ locationSegments: [city], searchParams });
}

export default async function CityPage({ params, searchParams }: Props) {
  const { city } = await params;
  return <VillaListPage searchParams={searchParams} locationSegments={[city]} />;
}
