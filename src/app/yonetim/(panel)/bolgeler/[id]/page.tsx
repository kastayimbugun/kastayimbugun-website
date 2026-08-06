import { notFound } from "next/navigation";
import { getAdminRegion } from "@/lib/data/admin/regions";
import RegionForm from "@/components/admin/RegionForm";
import DeleteRegionButton from "@/components/admin/DeleteRegionButton";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function BolgeDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const region = await getAdminRegion(id);
  if (!region) notFound();

  return (
    <div>
      <BackLink href="/yonetim/bolgeler">Bölgeler</BackLink>

      <div className="mt-3">
        <PageHeader
          title={region.name}
          description={`${region.province} · ${region.villaCount} villa`}
          actions={
            <DeleteRegionButton
              id={region.id}
              name={region.name}
              villaCount={region.villaCount}
            />
          }
        />
      </div>

      <div className="mt-5">
        <RegionForm region={region} mode="edit" />
      </div>
    </div>
  );
}
