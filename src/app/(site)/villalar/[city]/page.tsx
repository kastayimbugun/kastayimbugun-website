import VillaListPage from "@/components/VillaListPage";

export const revalidate = 300;

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { city } = await params;
  return <VillaListPage searchParams={searchParams} regionSlug={city} />;
}
