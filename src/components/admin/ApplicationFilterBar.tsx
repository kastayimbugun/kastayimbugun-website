"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { inputCls, labelCls, btnSecondary } from "@/components/admin/ui/styles";

/**
 * Başvuru araması — durum URL'de tutulur (sunucu tarafı filtre, paylaşılabilir
 * görünüm). Talepler filtre çubuğunun sadeleştirilmiş hali.
 */
export default function ApplicationFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const q = params.get("q") ?? "";
  const hasFilter = Boolean(q || params.get("durum"));

  const submit = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set("q", value);
    else next.delete("q");
    next.delete("sayfa");
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const value = new FormData(e.currentTarget).get("q");
          submit(String(value ?? "").trim());
        }}
      >
        <label className="block">
          <span className={labelCls}>Ara</span>
          <div className="flex gap-2">
            <input
              key={q}
              name="q"
              defaultValue={q}
              placeholder="Villa adı, sahibi, telefon, konum…"
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
    </div>
  );
}
