import { getAdminSiteSettings } from "@/lib/data/admin/site";
import { getAdminCategories } from "@/lib/data/admin/categories";
import { getRegions } from "@/lib/data/villas";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";
import { PageHeader } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function AyarlarPage() {
  const [settings, categories, regions] = await Promise.all([
    getAdminSiteSettings(),
    getAdminCategories(),
    getRegions(),
  ]);

  return (
    <div>
      <PageHeader
        title="Site ayarları"
        description="Ana sayfanın en üstündeki görsel ve video. Değişiklik birkaç dakika içinde sitede görünür."
      />
      <div className="mt-6">
        <SiteSettingsForm
          settings={settings}
          categories={categories}
          regions={regions}
        />
      </div>
    </div>
  );
}
