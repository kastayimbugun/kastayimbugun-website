import { Images, CalendarDays, Tags } from "lucide-react";
import { getRegionOptions } from "@/lib/data/admin/regions";
import VillaForm from "@/components/admin/VillaForm";
import Tabs from "@/components/admin/Tabs";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

/**
 * Yeni villa ekranı, düzenleme ekranıyla aynı sekme yapısını gösterir.
 *
 * Görsel / sezon / takvim bir `villaId` ister — villa kaydedilmeden o kimlik
 * yoktur. Bu yüzden sekmeler burada da görünür ama içerikleri "önce kaydedin"
 * der; kaydedilir kaydedilmez doğrudan Görseller sekmesine geçilir
 * (VillaForm, create modunda oraya yönlendirir). Böylece iki farklı ekran
 * arasında geziniyormuş hissi kalmaz.
 */
function Locked({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Images;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-sand-50 px-6 py-10 text-center">
      <Icon className="mx-auto h-8 w-8 text-brand-900/30" />
      <h3 className="mt-3 text-sm font-bold text-brand-950">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-brand-900/70">
        {description}
      </p>
      <p className="mt-3 text-xs font-semibold text-brand-700">
        Bilgiler sekmesindeki &quot;Villa Oluştur&quot; ile kaydedin — bu sekme
        hemen açılacak.
      </p>
    </div>
  );
}

export default async function YeniVillaPage() {
  const regions = await getRegionOptions();

  return (
    <div>
      <BackLink href="/yonetim/villalar">Villalar</BackLink>

      <div className="mt-3">
        <PageHeader
          title="Yeni Villa"
          description="Temel bilgileri girip kaydedin; ardından görseller sekmesi açılır."
        />
      </div>

      <div className="mt-5">
        <Tabs
          paramKey="sekme"
          tabs={[
            {
              id: "info",
              label: "Bilgiler",
              content: (
                <VillaForm villa={null} regions={regions} mode="create" />
              ),
            },
            {
              id: "images",
              label: "Görseller",
              content: (
                <Locked
                  icon={Images}
                  title="Görseller villa kaydedildikten sonra yüklenir"
                  description="Fotoğraflar villanın kendi klasörüne yüklendiği için önce villa kaydının oluşması gerekiyor."
                />
              ),
            },
            {
              id: "seasons",
              label: "Sezon Fiyatları",
              content: (
                <Locked
                  icon={Tags}
                  title="Sezon fiyatları villa kaydedildikten sonra girilir"
                  description="Şimdilik Bilgiler sekmesindeki taban fiyat ve fiyat kuralları yeterli; sezonları kayıttan sonra ekleyebilirsiniz."
                />
              ),
            },
            {
              id: "calendar",
              label: "Takvim",
              content: (
                <Locked
                  icon={CalendarDays}
                  title="Takvim villa kaydedildikten sonra açılır"
                  description="Dolu/kapalı tarihler villa kaydına bağlı tutulur."
                />
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
