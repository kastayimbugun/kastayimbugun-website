"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { inputCls, labelCls, btnSecondary } from "@/components/admin/ui/styles";
import type { VillaOption } from "@/lib/data/admin/villas";

/**
 * Talep filtreleri. Tüm durum URL'de tutulur (sunucu tarafı filtreleme) —
 * böylece filtreli görünüm paylaşılabilir, geri tuşu çalışır ve liste
 * istemcide değil veritabanında daraltılır (docs/panel-kurallari.md §5, ölçek).
 */
/** İlk seçenek her zaman "param yok" (varsayılan) durumuna karşılık gelir. */
const defaultSortOptions = [
  { value: "yeni", label: "Önce en yeni talep" },
  { value: "giris", label: "Önce yaklaşan giriş" },
];

export default function BookingFilterBar({
  villas,
  sortOptions = defaultSortOptions,
}: {
  villas: VillaOption[];
  /** Rezervasyonlar sayfası varsayılanı yaklaşan girişe çevirmek için kullanır. */
  sortOptions?: { value: string; label: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const villa = params.get("villa") ?? "";
  const from = params.get("baslangic") ?? "";
  const to = params.get("bitis") ?? "";
  const sort = params.get("sirala") ?? sortOptions[0].value;

  const hasFilter = Boolean(q || villa || from || to || params.get("durum"));

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

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Arama — Enter ya da butonla gönderilir */}
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
                placeholder="Ad, telefon veya e-posta"
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
          <span className={labelCls}>Villa</span>
          <select
            className={inputCls}
            value={villa}
            onChange={(e) => push({ villa: e.target.value })}
          >
            <option value="">Tüm villalar</option>
            {villas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelCls}>Giriş — en erken</span>
            <input
              type="date"
              className={inputCls}
              value={from}
              onChange={(e) => push({ baslangic: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Giriş — en geç</span>
            <input
              type="date"
              className={inputCls}
              value={to}
              onChange={(e) => push({ bitis: e.target.value })}
            />
          </label>
        </div>

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
