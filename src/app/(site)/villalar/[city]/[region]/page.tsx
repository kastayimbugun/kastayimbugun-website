import VillaListPage from "@/components/VillaListPage";

export const revalidate = 300;

export default async function RegionPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string; region: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // En derin segment bölgeyi belirler; üsttekiler yalnızca URL hiyerarşisi.
  const { region } = await params;
  return <VillaListPage searchParams={searchParams} regionSlug={region} />;
}
