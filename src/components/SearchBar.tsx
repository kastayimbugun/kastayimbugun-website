"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  MapPin,
  CalendarDays,
  Search,
  Home,
  Gem,
  Star,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toISO } from "@/lib/format";
import type { Region } from "@/lib/data/villas";
import GuestSelector, { type GuestCounts } from "./GuestSelector";

function Segment({
  icon: Icon,
  label,
  children,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLLabelElement>) => void;
}) {
  return (
    <label
      onClick={onClick}
      className="group flex flex-1 cursor-pointer items-center gap-3 rounded-xl px-4 py-3 transition hover:bg-sand-50"
    >
      <Icon className="h-5 w-5 shrink-0 text-brand-500" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-900/45">
          {label}
        </div>
        {children}
      </div>
    </label>
  );
}

export default function SearchBar({ regions }: { regions: Region[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const [mode, setMode] = useState<"region" | "name">("region");

  const [region, setRegion] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState<GuestCounts>({
    adults: 2,
    children: 0,
    babies: 0,
  });
  const [name, setName] = useState("");

  // Sekme şeridi mobilde yana kayabilir; sağda içerik kaldıkça ipucu gösterilir
  const tabsRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHint = useCallback(() => {
    const el = tabsRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollHint();
    window.addEventListener("resize", updateScrollHint);
    return () => window.removeEventListener("resize", updateScrollHint);
  }, [updateScrollHint]);

  const today = toISO(new Date());
  // Çıkış girişten en az bir gün sonra olmalı
  const minCheckOut = checkIn
    ? toISO(new Date(new Date(checkIn + "T00:00:00").getTime() + 86400000))
    : today;

  const submit = () => {
    const p = new URLSearchParams();
    if (mode === "name") {
      if (name) p.set("q", name);
      router.push(`/villalar?${p.toString()}`);
    } else {
      if (checkIn) p.set("in", checkIn);
      if (checkOut) p.set("out", checkOut);
      const total = guests.adults + guests.children;
      if (total) p.set("guests", String(total));
      if (guests.babies) p.set("babies", String(guests.babies));

      // Hiyerarşik URL yönlendirmesi
      if (region) {
        // region slug veya full path olabilir
        if (region.includes("/")) {
          const queryString = p.toString() ? `?${p.toString()}` : "";
          router.push(`/villalar/${region}${queryString}`);
          return;
        }

        const selectedReg = regions.find((r) => r.slug === region || r.name === region);
        if (selectedReg) {
          // Hiyerarşik yolu oluştur (İl / İlçe / Bölge)
          const pathSegments: string[] = [selectedReg.slug];
          let curr = selectedReg;
          const regMap = new Map(regions.map((r) => [r.id, r]));

          while (curr.parentId && regMap.has(curr.parentId)) {
            const parent = regMap.get(curr.parentId)!;
            pathSegments.unshift(parent.slug);
            curr = parent;
          }

          const hierarchicalPath = pathSegments.join("/");
          const queryString = p.toString() ? `?${p.toString()}` : "";
          router.push(`/villalar/${hierarchicalPath}${queryString}`);
          return;
        }
      }
      router.push(`/villalar?${p.toString()}`);
    }
  };

  const inputCls =
    "w-full bg-transparent text-sm font-semibold text-brand-950 outline-none placeholder:text-brand-900/40";

  // Tarih alanının herhangi bir yerine tıklanınca yerel takvimi aç
  const openPicker = (e: React.MouseEvent<HTMLElement>) => {
    const input = e.currentTarget.querySelector("input") as
      | (HTMLInputElement & { showPicker?: () => void })
      | null;
    try {
      input?.showPicker?.();
    } catch {
      /* showPicker desteklenmiyorsa yoksay */
    }
  };

  return (
    <div className="w-full">
      {/* Sekmeler — mobilde tek satır, yana kaydırmalı */}
      <div className="relative -mb-px">
        <div
          ref={tabsRef}
          onScroll={updateScrollHint}
          className="no-scrollbar flex items-end gap-1.5 overflow-x-auto pt-3"
        >
          {/* Villa — bölge araması */}
          <button
            onClick={() => setMode("region")}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-xl px-3 py-2.5 text-xs font-bold transition sm:gap-2 sm:px-5 sm:py-3 sm:text-sm ${
              mode === "region"
                ? "bg-white text-brand-700 shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.3)]"
                : "bg-brand-950/80 text-white backdrop-blur hover:bg-brand-950"
            }`}
          >
            <Home
              className={`h-4 w-4 ${
                mode === "region" ? "text-brand-600" : "text-brand-300"
              }`}
            />
            {t("tabs.main")}
          </button>

          {/* 2026 Fırsatları — erken rezervasyon */}
          <button
            onClick={() => router.push("/villalar")}
            className="relative flex shrink-0 items-center gap-1.5 rounded-t-xl bg-brand-500 px-3 py-2.5 text-xs font-bold text-brand-950 shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.3)] transition hover:bg-brand-400 sm:gap-2 sm:px-5 sm:py-3 sm:text-sm"
          >
            <span className="absolute -top-2 left-3 rounded bg-brand-950 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              {t("tabs.dealsBadge")}
            </span>
            <Gem className="h-4 w-4" />
            {t("tabs.deals")}
          </button>

          {/* Kampanyalı Villalar */}
          <button
            onClick={() => router.push("/villalar")}
            className="relative flex shrink-0 items-center gap-1.5 rounded-t-xl bg-brand-950/80 px-3 py-2.5 text-xs font-bold text-white backdrop-blur transition hover:bg-brand-950 sm:gap-2 sm:px-5 sm:py-3 sm:text-sm"
          >
            <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded bg-emerald-500 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-white shadow">
              {t("tabs.campaignBadge")}
            </span>
            <Star className="h-4 w-4 fill-brand-300 text-brand-300" />
            <span className="sm:hidden">{t("tabs.campaignShort")}</span>
            <span className="hidden sm:inline">{t("tabs.campaign")}</span>
          </button>

          {/* Villa Adı / Kodu ile Ara */}
          <button
            onClick={() => setMode("name")}
            className={`flex shrink-0 items-center gap-1.5 rounded-t-xl px-3 py-2.5 text-xs font-bold transition sm:gap-2 sm:px-5 sm:py-3 sm:text-sm ${
              mode === "name"
                ? "bg-white text-brand-700 shadow-[0_-6px_16px_-8px_rgba(0,0,0,0.3)]"
                : "bg-brand-950/80 text-white backdrop-blur hover:bg-brand-950"
            }`}
          >
            <Search
              className={`h-4 w-4 ${
                mode === "name" ? "text-brand-600" : "text-brand-300"
              }`}
            />
            <span className="sm:hidden">{t("tabs.byNameShort")}</span>
            <span className="hidden sm:inline">{t("tabs.byName")}</span>
          </button>
        </div>

        {/* Kaydırma ipucu — sağda sekme kaldıkça kenar solar */}
        {canScrollRight && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-0 w-12 bg-gradient-to-l from-brand-950/60 to-transparent"
          />
        )}
      </div>

      {/* Gövde */}
      <div className="rounded-b-2xl rounded-tr-2xl bg-white p-2 shadow-2xl ring-1 ring-black/5">
        {mode === "region" ? (
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
            <div className="flex flex-1 flex-col divide-y divide-sand-200 md:flex-row md:divide-x md:divide-y-0">
              <Segment icon={MapPin} label={t("search.region")}>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className={inputCls}
                >
                  <option value="">{t("search.regionPh")}</option>
                  {(() => {
                    const regMap = new Map(regions.map((r) => [r.id, r]));
                    const childMap = new Map<string, Region[]>();

                    regions.forEach((r) => {
                      if (r.parentId) {
                        const list = childMap.get(r.parentId) ?? [];
                        list.push(r);
                        childMap.set(r.parentId, list);
                      }
                    });

                    const cities = regions.filter((r) => !r.parentId || r.depth === 0);

                    return cities.map((city) => {
                      const districts = childMap.get(city.id) ?? [];

                      if (districts.length === 0) {
                        return (
                          <option key={city.slug} value={city.slug}>
                            {city.name}
                          </option>
                        );
                      }

                      return (
                        <optgroup key={city.slug} label={city.name}>
                          <option value={city.slug}>{city.name} (Tüm Bölgeler)</option>
                          {districts.flatMap((district) => {
                            const neighborhoods = childMap.get(district.id) ?? [];
                            const districtPath = `${city.slug}/${district.slug}`;

                            const districtOption = (
                              <option key={district.slug} value={districtPath}>
                                &nbsp;&nbsp;↳ {district.name} {neighborhoods.length > 0 ? "(Tüm İlçe)" : ""}
                              </option>
                            );

                            const neighborhoodOptions = neighborhoods.flatMap((n) => {
                              const subRegions = childMap.get(n.id) ?? [];
                              const nPath = `${districtPath}/${n.slug}`;

                              const nOpt = (
                                <option key={n.slug} value={nPath}>
                                  &nbsp;&nbsp;&nbsp;&nbsp;• {n.name} {subRegions.length > 0 ? "(Tüm Bölge)" : ""}
                                </option>
                              );

                              const subOpts = subRegions.map((sub) => (
                                <option
                                  key={sub.slug}
                                  value={`${nPath}/${sub.slug}`}
                                >
                                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;◦ {sub.name}
                                </option>
                              ));

                              return [nOpt, ...subOpts];
                            });

                            return [districtOption, ...neighborhoodOptions];
                          })}
                        </optgroup>
                      );
                    });
                  })()}
                </select>
              </Segment>

              <Segment
                icon={CalendarDays}
                label={t("search.checkIn")}
                onClick={openPicker}
              >
                <input
                  type="date"
                  min={today}
                  value={checkIn}
                  onChange={(e) => {
                    const v = e.target.value;
                    setCheckIn(v);
                    // Çıkış artık geçersizse temizle
                    if (checkOut && checkOut <= v) setCheckOut("");
                  }}
                  className={inputCls}
                />
              </Segment>

              <Segment
                icon={CalendarDays}
                label={t("search.checkOut")}
                onClick={openPicker}
              >
                <input
                  type="date"
                  min={minCheckOut}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className={inputCls}
                />
              </Segment>

              <GuestSelector value={guests} onChange={setGuests} />
            </div>

            <button
              onClick={submit}
              className="flex items-center justify-center gap-2 rounded-xl bg-sun-500 px-7 py-3.5 font-bold text-white shadow-sm transition hover:bg-sun-600"
            >
              <Search className="h-5 w-5" />
              {t("search.search")}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
            <Segment icon={Home} label={t("search.villaName")}>
              <input
                type="text"
                placeholder={t("search.villaNamePh")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                className={inputCls}
              />
            </Segment>

            <button
              onClick={submit}
              className="flex items-center justify-center gap-2 rounded-xl bg-sun-500 px-7 py-3.5 font-bold text-white shadow-sm transition hover:bg-sun-600"
            >
              <Search className="h-5 w-5" />
              {t("search.search")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
