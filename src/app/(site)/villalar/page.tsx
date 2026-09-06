import type { Metadata } from "next";
import VillaListPage, { buildListMetadata } from "@/components/VillaListPage";

export const revalidate = 300;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Kök liste. Kanonik yol `/villalar` — filtreler (tarih, kişi, fiyat, olanak,
 * sıralama) canonical'a girmez; `buildListMetadata` bunu `listPath()` üzerinden
 * yapısal olarak garanti eder.
 */
export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return buildListMetadata({ searchParams });
}

export default async function VillalarPage({ searchParams }: Props) {
  return <VillaListPage searchParams={searchParams} />;
}
