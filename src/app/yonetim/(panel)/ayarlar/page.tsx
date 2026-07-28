import { getAdminSiteSettings } from "@/lib/data/admin/site";
import SiteSettingsForm from "@/components/admin/SiteSettingsForm";

export const dynamic = "force-dynamic";

export default async function AyarlarPage() {
  const settings = await getAdminSiteSettings();

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-950">Site ayarları</h1>
      <p className="mt-1 text-sm text-brand-900/55">
        Ana sayfanın en üstündeki görsel ve video. Değişiklik birkaç dakika
        içinde sitede görünür.
      </p>
      <div className="mt-6">
        <SiteSettingsForm settings={settings} />
      </div>
    </div>
  );
}
