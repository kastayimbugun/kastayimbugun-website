import Link from "next/link";
import { ChevronRight, Plus, Star, Tags } from "lucide-react";
import { getAdminCategories } from "@/lib/data/admin/categories";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";
import { btnPrimary } from "@/components/admin/ui/styles";

export const dynamic = "force-dynamic";

const colorDot: Record<string, string> = {
  sky: "bg-sky-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  emerald: "bg-emerald-400",
  violet: "bg-violet-400",
  teal: "bg-teal-400",
};

export default async function KategorilerPage() {
  const categories = await getAdminCategories();

  const newButton = (
    <Link href="/yonetim/kategoriler/yeni" className={btnPrimary}>
      <Plus className="h-4 w-4" />
      Yeni kategori
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Kategoriler"
        description="Villa gruplarını düzenleyin ve villalarını atayın."
        actions={categories.length > 0 ? newButton : undefined}
      />

      {categories.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Tags}
            title="Henüz kategori yok"
            description="Kategoriler, ana sayfada villa satırları oluşturur. Ör. 'Balayı Villaları', 'Denize Sıfır'."
            action={newButton}
          />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/yonetim/kategoriler/${c.id}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${
                      colorDot[c.color ?? ""] ?? "bg-sand-300"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-brand-900">
                        {c.nameTr}
                      </span>
                      {c.featuredOnHome && (
                        <Star
                          className="h-3.5 w-3.5 fill-sun-400 text-sun-400"
                          aria-label="Ana sayfada gösteriliyor"
                        />
                      )}
                    </div>
                    <div className="text-sm text-brand-900/70">
                      {c.villaCount} villa
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
