"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { MapPin, Search, X, ChevronDown } from "lucide-react";
import { inputCls } from "@/components/admin/ui/styles";
import type { RegionOption } from "@/lib/data/admin/regions";

/**
 * Aranabilir tek alanlı bölge seçici.
 *
 * Eski sürüm iki ayrı yöntemi (uzun breadcrumb'lı dev dropdown + 4 kademeli
 * select) yan yana gösteriyordu; kalabalık ve kafa karıştırıcıydı. Artık tek
 * bir arama kutusu var: yaz → filtrele → seç. Her sonuçta bölge adı kalın,
 * altında konum yolu ("Antalya › Kaş › Kalkan") küçük ve gri.
 */
export default function CascadeRegionSelect({
  regions,
  value,
  onChange,
  error,
}: {
  regions: RegionOption[];
  value: string;
  onChange: (regionId: string) => void;
  error?: string;
}) {
  const regionMap = useMemo(() => {
    const m: Record<string, RegionOption> = {};
    regions.forEach((r) => {
      m[r.id] = r;
    });
    return m;
  }, [regions]);

  /** Bölgenin ÜST yolu: ["Antalya","Kaş","Kalkan"] (kendisi hariç). */
  const parentsOf = useMemo(() => {
    return (id: string): string[] => {
      const parents: string[] = [];
      let curr: RegionOption | undefined = regionMap[id];
      while (curr?.parentId) {
        const parent: RegionOption | undefined = regionMap[curr.parentId];
        if (!parent) break;
        parents.unshift(parent.name);
        curr = parent;
      }
      return parents;
    };
  }, [regionMap]);

  const norm = (s: string) => s.toLocaleLowerCase("tr");

  // Aranabilir seçenekler: ad + üst yol etiketi (arama her ikisinde de yapılır).
  const options = useMemo(() => {
    return regions
      .map((r) => {
        const parents = parentsOf(r.id);
        return {
          id: r.id,
          name: r.name,
          parentLabel: parents.join(" › "),
          search: norm(`${r.name} ${parents.join(" ")}`),
        };
      })
      .sort((a, b) =>
        `${a.parentLabel} ${a.name}`.localeCompare(
          `${b.parentLabel} ${b.name}`,
          "tr"
        )
      );
  }, [regions, parentsOf]);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca kapan.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const selected = value ? regionMap[value] : null;
  const selectedParents = value ? parentsOf(value).join(" › ") : "";

  const filtered = useMemo(() => {
    const q = norm(query.trim());
    const list = q ? options.filter((o) => o.search.includes(q)) : options;
    return list.slice(0, 60);
  }, [options, query]);

  const choose = (id: string) => {
    onChange(id);
    setOpen(false);
    setQuery("");
  };

  const baseCls = `${inputCls} ${error ? "border-rose-400" : ""}`;

  return (
    <div ref={boxRef} className="relative">
      {open ? (
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Bölge adı yazın… (ör. Kalkan, Kaş)"
            className={`${baseCls} pl-9`}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`${baseCls} flex w-full items-center justify-between gap-2 text-left`}
        >
          {selected ? (
            <span className="inline-flex min-w-0 items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="min-w-0 truncate">
                <span className="font-semibold text-brand-950">
                  {selected.name}
                </span>
                {selectedParents && (
                  <span className="ml-1.5 text-xs text-brand-900/50">
                    {selectedParents}
                  </span>
                )}
              </span>
            </span>
          ) : (
            <span className="text-brand-900/45">Bölge seçin veya arayın…</span>
          )}
          <span className="flex shrink-0 items-center gap-1">
            {value && (
              <X
                className="h-4 w-4 text-brand-900/40 hover:text-rose-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange("");
                }}
              />
            )}
            <ChevronDown className="h-4 w-4 text-brand-900/40" />
          </span>
        </button>
      )}

      {open && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-sand-200 bg-white py-1 shadow-lg">
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => choose(o.id)}
              className={`block w-full px-3 py-2 text-left transition hover:bg-brand-50 ${
                o.id === value ? "bg-brand-50" : ""
              }`}
            >
              <div className="text-sm font-semibold text-brand-950">
                {o.name}
              </div>
              {o.parentLabel && (
                <div className="text-xs text-brand-900/50">{o.parentLabel}</div>
              )}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-4 text-center text-sm text-brand-900/50">
              Sonuç bulunamadı.
            </p>
          )}
          {!query && options.length > filtered.length && (
            <p className="border-t border-sand-100 px-3 py-2 text-center text-[11px] text-brand-900/40">
              {options.length} bölgeden ilk {filtered.length} tanesi — daralt için yazın.
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
