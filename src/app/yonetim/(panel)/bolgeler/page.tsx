import { getAdminRegions } from "@/lib/data/admin/regions";
import RegionsManager from "@/components/admin/RegionsManager";

export const dynamic = "force-dynamic";

export default async function BolgelerPage() {
  const regions = await getAdminRegions();

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-950">Bölgeler</h1>
      <p className="mt-1 text-sm text-brand-900/55">
        Villaların atandığı bölgeler. Villası olan bölge silinemez.
      </p>
      <div className="mt-5">
        <RegionsManager regions={regions} />
      </div>
    </div>
  );
}
