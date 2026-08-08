"use client";

import { useMemo, useState, useEffect } from "react";
import { ChevronRight, MapPin, Zap } from "lucide-react";
import { inputCls } from "@/components/admin/ui/styles";
import type { RegionOption } from "@/lib/data/admin/regions";

/**
 * Modern & Esnek Bölge Seçici:
 * 1. ⚡ Hızlı Bölge Seçimi (doğrudan "Kalkan (Antalya › Kaş)" gibi tüm bölgeleri arayıp/seçme)
 * 2. 3 Kademeli Hiyerarşik Seçim (İl → İlçe → Bölge)
 *
 * Her iki alan birbirini otomatik senkronize eder.
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

  // Hiyerarşik tam yol etiketini bulma fonksiyonu (Örn: "Kalkan (Antalya › Kaş)")
  const getRegionFullPath = useMemo(() => {
    return (id: string) => {
      const target = regionMap[id];
      if (!target) return "";

      const parents: string[] = [];
      let curr: RegionOption | undefined = target;
      while (curr?.parentId) {
        const parent: RegionOption | undefined = regionMap[curr.parentId];
        if (!parent) break;
        parents.unshift(parent.name);
        curr = parent;
      }

      if (parents.length === 0) return target.name;
      return `${target.name} (${parents.join(" › ")})`;
    };
  }, [regionMap]);

  // Hızlı seçim için tüm bölgeleri alfabetik / mantıksal sıralayalım
  const quickOptions = useMemo(() => {
    return [...regions].map((r) => ({
      id: r.id,
      name: r.name,
      depth: r.depth,
      fullLabel: getRegionFullPath(r.id),
    })).sort((a, b) => a.fullLabel.localeCompare(b.fullLabel, "tr"));
  }, [regions, getRegionFullPath]);

  // Hiyerarşiyi geri çözme (ID -> City, District, Region)
  const resolveInitial = (id: string) => {
    const target = regionMap[id];
    if (!target) return { city: "", district: "", region: "" };

    if (target.depth === 0) return { city: id, district: "", region: "" };
    if (target.depth === 1) {
      return { city: target.parentId ?? "", district: id, region: "" };
    }
    // depth 2
    const district = target.parentId ? regionMap[target.parentId] : null;
    return {
      city: district?.parentId ?? "",
      district: target.parentId ?? "",
      region: id,
    };
  };

  const initial = resolveInitial(value);
  const [selectedCity, setSelectedCity] = useState(initial.city);
  const [selectedDistrict, setSelectedDistrict] = useState(initial.district);
  const [selectedRegion, setSelectedRegion] = useState(initial.region);

  // value değiştiğinde state'leri senkronize et
  useEffect(() => {
    const resolved = resolveInitial(value);
    setSelectedCity(resolved.city);
    setSelectedDistrict(resolved.district);
    setSelectedRegion(resolved.region);
  }, [value]);

  // Seviyelere göre filtrelenmiş listeler
  const cities = useMemo(
    () => regions.filter((r) => r.depth === 0),
    [regions]
  );
  const districts = useMemo(
    () => regions.filter((r) => r.depth === 1 && r.parentId === selectedCity),
    [regions, selectedCity]
  );
  const neighborhoods = useMemo(
    () =>
      regions.filter(
        (r) => r.depth === 2 && r.parentId === selectedDistrict
      ),
    [regions, selectedDistrict]
  );

  // Hızlı seçim handler
  const handleQuickSelect = (id: string) => {
    if (!id) {
      setSelectedCity("");
      setSelectedDistrict("");
      setSelectedRegion("");
      onChange("");
      return;
    }
    const resolved = resolveInitial(id);
    setSelectedCity(resolved.city);
    setSelectedDistrict(resolved.district);
    setSelectedRegion(resolved.region);
    onChange(id);
  };

  const handleCityChange = (cityId: string) => {
    setSelectedCity(cityId);
    setSelectedDistrict("");
    setSelectedRegion("");

    const cityChildren = regions.filter((r) => r.parentId === cityId);
    if (cityChildren.length === 0) {
      onChange(cityId);
    } else {
      onChange("");
    }
  };

  const handleDistrictChange = (districtId: string) => {
    setSelectedDistrict(districtId);
    setSelectedRegion("");

    const districtChildren = regions.filter((r) => r.parentId === districtId);
    if (districtChildren.length === 0) {
      onChange(districtId);
    } else {
      onChange("");
    }
  };

  const handleRegionChange = (regionId: string) => {
    setSelectedRegion(regionId);
    onChange(regionId);
  };

  const selectedLabel = useMemo(() => {
    if (!value) return null;
    const target = regionMap[value];
    if (!target) return null;

    const parts: string[] = [target.name];
    let curr: RegionOption | undefined = target;
    while (curr?.parentId) {
      const parent: RegionOption | undefined = regionMap[curr.parentId];
      if (!parent) break;
      parts.unshift(parent.name);
      curr = parent;
    }
    return parts.join(" › ");
  }, [value, regionMap]);

  const baseCls = `${inputCls} ${error ? "border-rose-400" : ""}`;

  return (
    <div className="space-y-3 rounded-xl border border-sand-200 bg-sand-50/50 p-3">
      {/* 1. Hızlı Seçim Dropdown'ı */}
      <div>
        <label className="mb-1 flex items-center gap-1.5 text-xs font-bold text-brand-950">
          <Zap className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          Hızlı Bölge Seçimi
        </label>
        <select
          className={baseCls}
          value={value}
          onChange={(e) => handleQuickSelect(e.target.value)}
        >
          <option value="">⚡ Bölgeyi arayın veya listeden seçin…</option>
          {quickOptions.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.fullLabel}
            </option>
          ))}
        </select>
      </div>

      {/* Seçili konum özeti */}
      {selectedLabel && (
        <div className="flex items-center gap-1.5 rounded-lg bg-brand-50 border border-brand-200 px-3 py-1.5 text-xs font-bold text-brand-800">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-600" />
          <span>Seçili Konum: <strong>{selectedLabel}</strong></span>
        </div>
      )}

      {/* 2. Adım Adım Kademeli Seçim (İl → İlçe → Bölge) */}
      <div className="border-t border-sand-200 pt-2.5">
        <label className="mb-1.5 block text-[11px] font-semibold text-brand-900/60">
          Veya adım adım hiyerarşik seçin:
        </label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          {/* Adım 1: İl */}
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold text-brand-900/70">
              1. İl
            </label>
            <select
              className={baseCls}
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
            >
              <option value="">İl seçin…</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Adım 2: İlçe */}
          {selectedCity && districts.length > 0 && (
            <>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-brand-400 sm:block sm:mt-4" />
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-semibold text-brand-900/70">
                  2. İlçe
                </label>
                <select
                  className={baseCls}
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                >
                  <option value="">İlçe seçin…</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Adım 3: Bölge */}
          {selectedDistrict && neighborhoods.length > 0 && (
            <>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-brand-400 sm:block sm:mt-4" />
              <div className="flex-1">
                <label className="mb-1 block text-[11px] font-semibold text-brand-900/70">
                  3. Bölge
                </label>
                <select
                  className={baseCls}
                  value={selectedRegion}
                  onChange={(e) => handleRegionChange(e.target.value)}
                >
                  <option value="">Bölge seçin…</option>
                  {neighborhoods.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-xs font-semibold text-rose-600">{error}</p>
      )}
    </div>
  );
}
