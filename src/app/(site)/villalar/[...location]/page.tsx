import type { Metadata } from "next";
import VillaListPage, { buildListMetadata } from "@/components/VillaListPage";

export const revalidate = 300;

type Props = {
  params: Promise<{ location: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Üç ve daha derin bölge yolu (ör. `/villalar/antalya/kas/kalkan/cukurbag`).
 * Bu rota kanonik biçimin ta kendisidir: `regionPath()` bölgenin tam üst
 * zincirini basar, derin bölgeler yalnızca buradan yazılabilir.
 *
 * Zincirin TAMAMI doğrulanır; sırası bölgenin gerçek `parentId` zinciriyle
 * uyuşmayan yol 404 olur. (Hiyerarşi için `regions.depth` sütununa
 * BAKILMAZ — o sütun bozuk; bkz. `src/lib/seo/urls.ts`.)
 */
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { location } = await params;
  return buildListMetadata({ locationSegments: location, searchParams });
}

export default async function DynamicLocationPage({ params, searchParams }: Props) {
  const { location } = await params;
  return <VillaListPage searchParams={searchParams} locationSegments={location} />;
}
