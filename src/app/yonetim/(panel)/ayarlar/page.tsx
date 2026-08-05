import { getAdminSiteSettings } from "@/lib/data/admin/site";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import { PageHeader } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AyarlarPage() {
  const settings = await getAdminSiteSettings();

  return (
    <div>
      <PageHeader
        title="Site ayarları"
        description="Ana sayfanın en üstündeki görsel ve video. Değişiklik birkaç dakika içinde sitede görünür."
      />
      <div className="mt-6">
        <SiteSettingsForm settings={settings} />
      </div>
    </div>
  );
}
