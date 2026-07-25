import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getAdminVillas, type VillaStatus } from "@/lib/data/admin/villas";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const statusMeta: Record<VillaStatus, { label: string; cls: string }> = {
  published: { label: "Yayında", cls: "bg-emerald-50 text-emerald-700" },
  draft: { label: "Taslak", cls: "bg-sun-50 text-sun-700" },
  archived: { label: "Arşiv", cls: "bg-sand-100 text-brand-900/50" },
};

export default async function VillalarPage() {
  const villas = await getAdminVillas();

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-950">Villalar</h1>
      <p className="mt-1 text-sm text-brand-900/55">
        Sezon fiyatları ve takvim için bir villa seçin.
      </p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-sand-200 bg-white">
        <ul className="divide-y divide-sand-100">
          {villas.map((v) => {
            const s = statusMeta[v.status];
            return (
              <li key={v.id}>
                <Link
                  href={`/yonetim/villalar/${v.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-sand-50"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-900">
                        {v.name}
                      </span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${s.cls}`}
                      >
                        {s.label}
                      </span>
                    </div>
                    <div className="text-sm text-brand-900/55">
                      {v.regionName}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-brand-950">
                    {formatPrice(v.basePrice)}
                  </span>
                  <ChevronRight className="h-4 w-4 text-brand-900/30" />
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
