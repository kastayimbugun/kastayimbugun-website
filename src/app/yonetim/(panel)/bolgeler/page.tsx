import Link from "next/link";
import { ChevronRight, Plus, MapPin } from "lucide-react";
import { getAdminRegions } from "@/lib/data/admin/regions";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";
import { btnPrimary } from "@/components/admin/ui/styles";

export const dynamic = "force-dynamic";

export default async function BolgelerPage() {
  const regions = await getAdminRegions();

  const newButton = (
    <Link href="/yonetim/bolgeler/yeni" className={btnPrimary}>
      <Plus className="h-4 w-4" />
      Yeni bölge
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Bölgeler"
        description="Villaların atandığı bölgeler. Villası olan bölge silinemez."
        actions={regions.length > 0 ? newButton : undefined}
      />

      {regions.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={MapPin}
            title="Henüz bölge yok"
            description="Villa ekleyebilmek için önce en az bir bölge tanımlamalısınız."
            action={newButton}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {regions.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/yonetim/bolgeler/${r.id}`}
                  className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-sand-100">
                    {r.heroImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.heroImageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-brand-900">{r.name}</div>
                    <div className="text-sm text-brand-900/70">
                      {r.province} · {r.villaCount} villa · sıra #{r.sortOrder}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-brand-900/50" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
