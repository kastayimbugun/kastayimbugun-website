import RegionForm from "@/components/admin/RegionForm";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default function YeniBolgePage() {
  return (
    <div>
      <BackLink href="/yonetim/bolgeler">Bölgeler</BackLink>

      <div className="mt-3">
        <PageHeader
          title="Yeni Bölge"
          description="Bölge kaydedildikten sonra ana sayfa kart görselini yükleyebilirsiniz."
        />
      </div>

      <div className="mt-5">
        <RegionForm region={null} mode="create" />
      </div>
    </div>
  );
}
