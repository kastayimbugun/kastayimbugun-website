import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-brand-950">Villalar</h1>
          <p className="mt-1 text-sm text-brand-900/55">
            Düzenlemek için bir villa seçin veya yeni villa ekleyin.
          </p>
        </div>
        <Link
          href="/yonetim/villalar/yeni"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sun-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sun-600"
        >
          <Plus className="h-4 w-4" />
          Yeni villa
        </Link>
      </div>

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
