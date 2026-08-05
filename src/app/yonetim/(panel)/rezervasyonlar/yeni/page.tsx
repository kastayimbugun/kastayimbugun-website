import { getVillaPricingOptions } from "@/lib/data/admin/villas";
import ManualBookingForm from "@/components/admin/ManualBookingForm";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function YeniRezervasyonPage() {
  const villas = await getVillaPricingOptions();

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/yonetim/rezervasyonlar">Rezervasyonlar</BackLink>

      <div className="mt-3">
        <PageHeader
          title="Yeni Rezervasyon"
          description="Telefonla gelen rezervasyonu doğrudan buraya girin. Kaydedince villa takvimi hemen kapanır — talep aşamasından geçmez."
        />
      </div>

      <div className="mt-5">
        <ManualBookingForm villas={villas} />
      </div>
    </div>
  );
}
