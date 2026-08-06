import { getVillaOptions } from "@/lib/data/admin/villas";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";
import BulkUpdatePanel from "@/components/admin/BulkUpdatePanel";

export const dynamic = "force-dynamic";

export default async function TopluGuncellemePage() {
  const villas = await getVillaOptions();

  return (
    <div>
      <BackLink href="/yonetim/takvim">Takvim</BackLink>
      <div className="mt-4">
        <PageHeader
          title="Toplu güncelleme"
          description="Bir tarih aralığı ve birden çok villa seçip fiyat/min. gece yazın ya da tarihleri toplu kapatıp açın. Sezon başında en çok işi kısaltan ekran."
        />
      </div>

      <div className="mt-5">
        <BulkUpdatePanel villas={villas} />
      </div>
    </div>
  );
}
