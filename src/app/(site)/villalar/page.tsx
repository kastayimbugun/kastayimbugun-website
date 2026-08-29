import VillaListPage from "@/components/VillaListPage";

export const revalidate = 300;

export default async function VillalarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <VillaListPage searchParams={searchParams} />;
}
