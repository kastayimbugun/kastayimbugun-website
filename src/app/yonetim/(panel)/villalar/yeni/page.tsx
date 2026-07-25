import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getRegionOptions } from "@/lib/data/admin/regions";
import VillaForm from "@/components/admin/VillaForm";

export const dynamic = "force-dynamic";

export default async function YeniVillaPage() {
  const regions = await getRegionOptions();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/yonetim/villalar"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Villalar
      </Link>
      <h1 className="mt-3 text-xl font-extrabold text-brand-950">Yeni Villa</h1>
      <p className="mt-1 text-sm text-brand-900/55">
        Temel bilgileri girin. Kaydettikten sonra görsel, sezon ve takvim
        ekleyebilirsiniz.
      </p>
      <div className="mt-5">
        <VillaForm villa={null} regions={regions} mode="create" />
      </div>
    </div>
  );
}
