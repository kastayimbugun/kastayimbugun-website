import Link from "next/link";
import { ChevronRight, Plus, Home } from "lucide-react";
import { getAdminVillas } from "@/lib/data/admin/villas";
import { formatPrice } from "@/lib/format";
import { villaStatusMeta } from "@/lib/adminMeta";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { btnPrimary } from "@/components/admin/ui/styles";

export const dynamic = "force-dynamic";

export default async function VillalarPage() {
  const villas = await getAdminVillas();

  const newVillaButton = (
    <Link href="/yonetim/villalar/yeni" className={btnPrimary}>
      <Plus className="h-4 w-4" />
      Yeni villa
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Villalar"
        description="Düzenlemek için bir villa seçin veya yeni villa ekleyin."
        actions={villas.length > 0 ? newVillaButton : undefined}
      />

      {villas.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Home}
            title="Henüz villa yok"
            description="İlk villanızı ekleyin. Ekledikten sonra fotoğraf, sezon fiyatı ve takvim bilgilerini aynı sayfadan yönetebilirsiniz."
            action={newVillaButton}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {villas.map((v) => {
              const s = villaStatusMeta[v.status];
              return (
                <li key={v.id}>
                  <Link
                    href={`/yonetim/villalar/${v.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-brand-900">
                          {v.name}
                        </span>
                        <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                      </div>
                      <div className="text-sm text-brand-900/70">
                        {v.regionName}
                      </div>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-brand-950">
                      {formatPrice(v.basePrice)}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-brand-900/50" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
