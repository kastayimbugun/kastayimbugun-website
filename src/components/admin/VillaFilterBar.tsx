"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { inputCls, labelCls, btnSecondary } from "@/components/admin/ui/styles";
import type { RegionOption } from "@/lib/data/admin/regions";

/**
 * Villa filtreleri. Talep filtreleriyle aynı sözleşme: tüm durum URL'de tutulur,
 * daraltma veritabanında yapılır (docs/panel-kurallari.md §5) — filtreli görünüm
 * paylaşılabilir ve geri tuşu çalışır.
 */
const sortOptions = [
  { value: "ad", label: "Ada göre (A-Z)" },
  { value: "fiyat", label: "Önce yüksek fiyat" },
  { value: "yeni", label: "Önce en yeni eklenen" },
];

export default function VillaFilterBar({
  regions,
}: {
  regions: RegionOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const region = params.get("bolge") ?? "";
  const sort = params.get("sirala") ?? sortOptions[0].value;

  const hasFilter = Boolean(q || region || params.get("durum"));

  const push = useCallback(
    (patch: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      // Filtre değişince ilk sayfaya dön — 7. sayfada boş liste görünmesin.
      next.delete("sayfa");
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router]
  );

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-900/70">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtrele
        </span>
        {hasFilter && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1 rounded text-sm font-semibold text-brand-700 hover:underline focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <X className="h-3.5 w-3.5" />
            Filtreleri temizle
          </button>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <form
          className="lg:col-span-2"
          onSubmit={(e) => {
            e.preventDefault();
            const value = new FormData(e.currentTarget).get("q");
            push({ q: String(value ?? "").trim() });
          }}
        >
          <label className="block">
            <span className={labelCls}>Ara</span>
            <div className="flex gap-2">
              <input
                // key: URL'deki değer değişince (ör. "Temizle") alan sıfırlanır
                key={q}
                name="q"
                defaultValue={q}
                placeholder="Villa adı, kısa ad veya tesis kodu"
                className={inputCls}
              />
              <button
                type="submit"
                aria-label="Ara"
                className={`${btnSecondary} shrink-0 px-3`}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </label>
        </form>

        <label className="block">
          <span className={labelCls}>Bölge</span>
          <select
            className={inputCls}
            value={region}
            onChange={(e) => push({ bolge: e.target.value })}
          >
            <option value="">Tüm bölgeler</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={labelCls}>Sıralama</span>
          <select
            className={inputCls}
            value={sort}
            onChange={(e) =>
              push({
                sirala:
                  e.target.value === sortOptions[0].value ? "" : e.target.value,
              })
            }
          >
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}
