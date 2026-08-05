import { getRegionOptions } from "@/lib/data/admin/regions";
import VillaForm from "@/components/admin/VillaForm";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function YeniVillaPage() {
  const regions = await getRegionOptions();

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/yonetim/villalar">Villalar</BackLink>

      <div className="mt-3">
        <PageHeader
          title="Yeni Villa"
          description="Temel bilgileri girin. Kaydettikten sonra görsel, sezon fiyatı ve takvim ekleyebilirsiniz."
        />
      </div>

      <div className="mt-5">
        <VillaForm villa={null} regions={regions} mode="create" />
      </div>
    </div>
  );
}
