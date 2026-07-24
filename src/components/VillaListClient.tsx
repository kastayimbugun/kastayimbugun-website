"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";
import VillaCard from "./VillaCard";
import { useI18n } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { villas, regions } from "@/lib/villas";
import type { AmenityKey } from "@/lib/types";
import { amenityIcons } from "@/lib/amenityIcons";

const filterAmenities: AmenityKey[] = [
  "privatePool",
  "heatedPool",
  "seaView",
  "jacuzzi",
  "petFriendly",
  "childproof",
  "wifi",
  "bbq",
];

type Sort = "featured" | "priceAsc" | "priceDesc" | "rating";

export default function VillaListClient() {
  const { t, lang, amenity } = useI18n();
  const params = useSearchParams();

  const [region, setRegion] = useState(params.get("region") ?? "");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [minGuests, setMinGuests] = useState(Number(params.get("guests")) || 0);
  const [minBeds, setMinBeds] = useState(0);
  const [maxPrice, setMaxPrice] = useState(25000);
  const [amenities, setAmenities] = useState<AmenityKey[]>([]);
  const [sort, setSort] = useState<Sort>("featured");
  const [drawer, setDrawer] = useState(false);

  const toggleAmenity = (a: AmenityKey) =>
    setAmenities((prev) =>
      prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]
    );

  const clear = () => {
    setRegion("");
    setQ("");
    setMinGuests(0);
    setMinBeds(0);
    setMaxPrice(25000);
    setAmenities([]);
  };

  const results = useMemo(() => {
    const list = villas.filter((v) => {
      if (region && v.region !== region) return false;
      if (q && !v.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (minGuests && v.capacity < minGuests) return false;
      if (minBeds && v.bedrooms < minBeds) return false;
      if (v.pricePerNight > maxPrice) return false;
      if (amenities.some((a) => !v.amenities.includes(a))) return false;
      return true;
    });

    return list.sort((a, b) => {
      switch (sort) {
        case "priceAsc":
          return a.pricePerNight - b.pricePerNight;
        case "priceDesc":
          return b.pricePerNight - a.pricePerNight;
        case "rating":
          return b.rating - a.rating;
        default:
          return Number(b.featured) - Number(a.featured) || b.rating - a.rating;
      }
    });
  }, [region, q, minGuests, minBeds, maxPrice, amenities, sort]);

  const Filters = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-brand-950">{t("list.filters")}</h3>
        <button
          onClick={clear}
          className="text-sm font-semibold text-sun-600 hover:underline"
        >
          {t("list.clear")}
        </button>
      </div>

      {/* Name search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-500" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("search.villaNamePh")}
          className="w-full rounded-xl border border-sand-200 bg-sand-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* Region */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-brand-900">
          {t("filter.region")}
        </label>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="w-full rounded-xl border border-sand-200 bg-white py-2.5 px-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
        >
          <option value="">{t("filter.allRegions")}</option>
          {regions.map((r) => (
            <option key={r.slug} value={r.name}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Capacity */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-brand-900">
          {t("filter.capacity")}
        </label>
        <div className="flex flex-wrap gap-2">
          {[0, 4, 6, 8, 10].map((n) => (
            <button
              key={n}
              onClick={() => setMinGuests(n)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                minGuests === n
                  ? "bg-brand-700 text-white"
                  : "bg-sand-100 text-brand-800 hover:bg-sand-200"
              }`}
            >
              {n === 0 ? t("filter.any") : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-brand-900">
          {t("filter.bedrooms")}
        </label>
        <div className="flex flex-wrap gap-2">
          {[0, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setMinBeds(n)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                minBeds === n
                  ? "bg-brand-700 text-white"
                  : "bg-sand-100 text-brand-800 hover:bg-sand-200"
              }`}
            >
              {n === 0 ? t("filter.any") : `${n}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-brand-900">
          {t("filter.price")}
        </label>
        <input
          type="range"
          min={4000}
          max={25000}
          step={500}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-brand-600"
        />
        <div className="mt-1 text-sm font-semibold text-brand-700">
          ≤ {formatPrice(maxPrice, lang)}
        </div>
      </div>

      {/* Amenities */}
      <div>
        <label className="mb-2 block text-sm font-semibold text-brand-900">
          {t("filter.amenities")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          {filterAmenities.map((a) => {
            const Icon = amenityIcons[a];
            const active = amenities.includes(a);
            return (
              <button
                key={a}
                onClick={() => toggleAmenity(a)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs font-medium transition ${
                  active
                    ? "border-brand-500 bg-brand-50 text-brand-800"
                    : "border-sand-200 text-brand-900/70 hover:border-brand-300"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0 text-brand-500" />
                {amenity(a)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">
          {region || t("list.title")}
        </h1>
        <p className="mt-1 text-brand-900/60">
          {results.length} {t("list.results")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 md:hidden">
        <button
          onClick={() => setDrawer(true)}
          className="inline-flex items-center gap-2 rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700"
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t("list.filters")}
        </button>
        <SortSelect sort={sort} setSort={setSort} />
      </div>

      <div className="mt-4 flex gap-8">
        {/* Sidebar */}
        <aside className="hidden w-72 shrink-0 md:block">
          <div className="sticky top-24 rounded-2xl border border-sand-200 bg-white p-5">
            {Filters}
          </div>
        </aside>

        {/* Results */}
        <div className="flex-1">
          <div className="mb-4 hidden items-center justify-end md:flex">
            <SortSelect sort={sort} setSort={setSort} />
          </div>

          {results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-sand-200 bg-sand-50 py-20 text-center text-brand-900/60">
              {t("list.noResults")}
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {results.map((v) => (
                <VillaCard key={v.slug} villa={v} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[85%] max-w-sm overflow-y-auto bg-white p-5 shadow-xl">
            <button
              onClick={() => setDrawer(false)}
              className="mb-4 ml-auto flex rounded-full p-1.5 hover:bg-sand-100"
            >
              <X className="h-5 w-5" />
            </button>
            {Filters}
            <button
              onClick={() => setDrawer(false)}
              className="mt-6 w-full rounded-xl bg-sun-500 py-3 font-semibold text-white"
            >
              {t("list.apply")} ({results.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SortSelect({
  sort,
  setSort,
}: {
  sort: Sort;
  setSort: (s: Sort) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-brand-900/60">{t("list.sort")}:</span>
      <select
        value={sort}
        onChange={(e) => setSort(e.target.value as Sort)}
        className="rounded-lg border border-sand-200 bg-white py-2 px-3 font-medium text-brand-900 outline-none focus:border-brand-400"
      >
        <option value="featured">{t("list.sortFeatured")}</option>
        <option value="priceAsc">{t("list.sortPriceAsc")}</option>
        <option value="priceDesc">{t("list.sortPriceDesc")}</option>
        <option value="rating">{t("list.sortRating")}</option>
      </select>
    </label>
  );
}
