import VillaListPage from "@/components/VillaListPage";

export const revalidate = 300;

export default async function DynamicLocationPage({
  params,
  searchParams,
}: {
  params: Promise<{ location: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { location } = await params;
  // En derin segment bölgeyi belirler (ör. /villalar/mugla/fethiye/oludeniz).
  const regionSlug = location[location.length - 1];
  return <VillaListPage searchParams={searchParams} regionSlug={regionSlug} />;
}
