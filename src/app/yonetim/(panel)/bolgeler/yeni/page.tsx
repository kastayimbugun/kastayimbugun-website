import RegionForm from "@/components/admin/RegionForm";
import { getRegionParentOptions } from "@/lib/data/admin/regions";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function YeniBolgePage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>;
}) {
  const { parent } = await searchParams;
  const parentOptions = await getRegionParentOptions();

  return (
    <div>
      <BackLink href="/yonetim/bolgeler">Bölgeler</BackLink>

      <div className="mt-3">
        <PageHeader
          title="Yeni Konum (İl, İlçe veya Bölge)"
          description="İl eklemek için Üst Konum alanını boş bırakın. İlçe eklemek için İl, Bölge eklemek için İlçe seçin."
        />
      </div>

      <div className="mt-5">
        <RegionForm
          region={null}
          mode="create"
          parentOptions={parentOptions}
          initialParentId={parent}
        />
      </div>
    </div>
  );
}
