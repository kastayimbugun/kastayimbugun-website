import { getAdminRegions } from "@/lib/data/admin/regions";
import RegionsManager from "@/components/admin/RegionsManager";
import { PageHeader } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function BolgelerPage() {
  const regions = await getAdminRegions();

  return (
    <div>
      <PageHeader
        title="Bölgeler"
        description="Villaların atandığı bölgeler. Villası olan bölge silinemez."
      />
      <div className="mt-5">
        <RegionsManager regions={regions} />
      </div>
    </div>
  );
}
