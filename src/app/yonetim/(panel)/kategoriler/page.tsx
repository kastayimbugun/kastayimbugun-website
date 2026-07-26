import Link from "next/link";
import { ChevronRight, Plus, Star } from "lucide-react";
import { getAdminCategories } from "@/lib/data/admin/categories";

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

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-brand-950">Kategoriler</h1>
          <p className="mt-1 text-sm text-brand-900/55">
            Villa gruplarını düzenleyin ve villalarını atayın.
          </p>
        </div>
        <Link
          href="/yonetim/kategoriler/yeni"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-sun-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sun-600"
        >
          <Plus className="h-4 w-4" />
          Yeni kategori
        </Link>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-sand-200 bg-white">
        <ul className="divide-y divide-sand-100">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/yonetim/kategoriler/${c.id}`}
                className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-sand-50"
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
                      <Star className="h-3.5 w-3.5 fill-sun-400 text-sun-400" />
                    )}
                  </div>
                  <div className="text-sm text-brand-900/55">
                    {c.villaCount} villa
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-brand-900/30" />
              </Link>
            </li>
          ))}
          {categories.length === 0 && (
            <li className="px-5 py-6 text-center text-sm text-brand-900/45">
              Henüz kategori yok.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
