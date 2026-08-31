"use client";

import { usePathname, useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SlidersHorizontal, X, Search } from "lucide-react";
import VillaCard from "./VillaCard";
import { useI18n } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import type { AmenityKey } from "@/lib/types";
import type {
  Region,
  VillaCardData,
  VillaListQuery,
} from "@/lib/data/villas";
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

/** Kaydıracın adımı; iki tutamak arasındaki en küçük mesafe de budur. */
const PRICE_STEP = 500;

export default function VillaListClient({
  items,
  total,
  page,
  pageCount,
  query,
  priceCeiling,
  regionLabel,
  regions,
}: {
  /** Sunucuda filtrelenmiş ve sayfalanmış kartlar (en fazla VILLAS_PAGE_SIZE). */
  items: VillaCardData[];
  total: number;
  page: number;
  pageCount: number;
  /** URL'den çözülmüş filtre değerleri. */
  query: VillaListQuery;
  /** Fiyat kaydırıcısının üst sınırı — veriden türetilir, sabit değil. */
  priceCeiling: number;
  /** Başlıkta gösterilecek bölge ADI (slug değil). */
  regionLabel?: string;
  regions: Region[];
}) {
  const { t, lang, amenity } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  // Filtre değerleri SUNUCUDAN prop olarak gelir; `useSearchParams` bilerek
  // kullanılmıyor. Statik bir sayfada onu çağırmak Suspense sınırının içini
  // tümüyle istemciye devrediyordu (CSR bailout): `/villalar`'ın prerender
  // HTML'inin %97'si inline script'ti ve DOM'da tek bir villa adı bile yoktu —
  // arama motoru boş sayfa görüyordu.
  const [region, setRegionLocal] = useState(query.bolge ?? "");
  const [q, setQLocal] = useState(query.q ?? "");
  const [minGuests, setMinGuestsLocal] = useState(query.kisi ?? 0);
  const [minBeds, setMinBedsLocal] = useState(query.yatak ?? 0);
  const [minPrice, setMinPriceLocal] = useState(query.minFiyat ?? 0);
  const [maxPrice, setMaxPriceLocal] = useState(query.maxFiyat ?? priceCeiling);
  const [amenities, setAmenitiesLocal] = useState<AmenityKey[]>(
    query.ozellik ?? []
  );
  const [sort, setSortLocal] = useState<Sort>(query.sirala ?? "featured");
  const [drawer, setDrawer] = useState(false);

  /**
   * Filtreyi URL'e yazar.
   *
   * Filtreler eskiden saf `useState`'ti: kullanıcı 6 filtre uygulayıp bir villaya
   * girip geri bastığında hepsi sıfırlanıyordu, link paylaşılamıyordu ve filtreli
   * sayfalar arama motoruna hiç görünmüyordu. `push` kullanılıyor ki geri tuşu
   * bir önceki filtreye dönsün.
   */
  const applyFilters = (patch: Record<string, string | number | string[] | undefined>) => {
    const current: Record<string, string | number | string[] | undefined> = {
      bolge: region || undefined,
      kategori: query.kategori,
      q: q || undefined,
      kisi: minGuests || undefined,
      yatak: minBeds || undefined,
      minFiyat: minPrice > 0 ? minPrice : undefined,
      maxFiyat: maxPrice < priceCeiling ? maxPrice : undefined,
      ozellik: amenities.length ? amenities : undefined,
      sirala: sort !== "featured" ? sort : undefined,
      ...patch,
      // Filtre değişince ilk sayfaya dön (patch açıkça sayfa vermediyse).
      sayfa: patch.sayfa,
    };

    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(current)) {
      if (v === undefined || v === "" || v === 0) continue;
      if (Array.isArray(v)) v.forEach((x) => sp.append(k, String(x)));
      else sp.set(k, String(v));
    }
    const qs = sp.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Metin ve kaydırıcı gibi sürekli girdilerde her tuşta URL yazmamak için
  // kısa bir gecikme; diğerleri anında uygulanır.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const applyDebounced = (
    patch: Record<string, string | number | string[] | undefined>
  ) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => applyFilters(patch), 450);
  };

  const setRegion = (v: string) => {
    setRegionLocal(v);
    applyFilters({ bolge: v || undefined });
  };
  const setQ = (v: string) => {
    setQLocal(v);
    applyDebounced({ q: v || undefined });
  };
  const setMinGuests = (v: number) => {
    setMinGuestsLocal(v);
    applyFilters({ kisi: v || undefined });
  };
  const setMinBeds = (v: number) => {
    setMinBedsLocal(v);
    applyFilters({ yatak: v || undefined });
  };
  // Tutamaklar birbirini geçemez: alt sınır üst sınırın bir adım altında,
  // üst sınır alt sınırın bir adım üstünde durur. Aksi hâlde "en az 20.000,
  // en çok 5.000" gibi hiçbir zaman sonuç vermeyecek bir aralık kurulabilirdi.
  const setMinPrice = (v: number) => {
    const clamped = Math.min(v, maxPrice - PRICE_STEP);
    setMinPriceLocal(clamped);
    applyDebounced({ minFiyat: clamped > 0 ? clamped : undefined });
  };
  const setMaxPrice = (v: number) => {
    const clamped = Math.max(v, minPrice + PRICE_STEP);
    setMaxPriceLocal(clamped);
    applyDebounced({ maxFiyat: clamped < priceCeiling ? clamped : undefined });
  };
  const setSort = (v: Sort) => {
    setSortLocal(v);
    applyFilters({ sirala: v !== "featured" ? v : undefined });
  };

  const toggleAmenity = (a: AmenityKey) => {
    const next = amenities.includes(a)
      ? amenities.filter((x) => x !== a)
      : [...amenities, a];
    setAmenitiesLocal(next);
    applyFilters({ ozellik: next.length ? next : undefined });
  };

  const clear = () => {
    setRegionLocal("");
    setQLocal("");
    setMinGuestsLocal(0);
    setMinBedsLocal(0);
    setMinPriceLocal(0);
    setMaxPriceLocal(priceCeiling);
    setAmenitiesLocal([]);
    applyFilters({
      bolge: undefined,
      q: undefined,
      kisi: undefined,
      yatak: undefined,
      minFiyat: undefined,
      maxFiyat: undefined,
      ozellik: undefined,
    });
  };

  // Sonuçlar sunucudan hazır gelir; istemcide filtreleme/sıralama YOK.
  const results = items;

  // Kartlara taşınacak arama bağlamı: tarih ve kişi sayısı detayda hazır gelsin.
  const cardContext = (() => {
    const sp = new URLSearchParams();
    if (query.giris) sp.set("giris", query.giris);
    if (query.cikis) sp.set("cikis", query.cikis);
    if (query.kisi) sp.set("kisi", String(query.kisi));
    return sp.toString();
  })();

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
          {(() => {
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

                    const districtOption = (
                      <option key={district.slug} value={district.slug}>
                        &nbsp;&nbsp;↳ {district.name} {neighborhoods.length > 0 ? "(Tüm İlçe)" : ""}
                      </option>
                    );

                    const neighborhoodOptions = neighborhoods.flatMap((n) => {
                      const subRegions = childMap.get(n.id) ?? [];

                      const nOpt = (
                        <option key={n.slug} value={n.slug}>
                          &nbsp;&nbsp;&nbsp;&nbsp;• {n.name} {subRegions.length > 0 ? "(Tüm Bölge)" : ""}
                        </option>
                      );

                      const subOpts = subRegions.map((sub) => (
                        <option key={sub.slug} value={sub.slug}>
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
        {/* Sınırlar veriden: `priceCeiling` yayındaki en yüksek gecelik taban
            fiyat. Eskiden hem varsayılan hem tavan 25.000 idi ve gecelik tabanı
            bunun üstündeki villalar hiçbir koşulda listelenemiyordu.

            Çift uçlu: tek uçlu kaydıraçla "5.000 ile 10.000 arası" denemez,
            yalnızca "10.000 altı" denirdi — bütçesi olan ama en ucuzu da
            istemeyen misafir aradığını bulamıyordu. */}
        <div className="range-dual relative mt-3 h-5">
          {/* Ray */}
          <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-sand-200" />
          {/* Seçili aralık */}
          <div
            className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-brand-600"
            style={{
              left: `${(minPrice / priceCeiling) * 100}%`,
              right: `${100 - (maxPrice / priceCeiling) * 100}%`,
            }}
          />
          <input
            type="range"
            min={0}
            max={priceCeiling}
            step={PRICE_STEP}
            value={minPrice}
            onChange={(e) => setMinPrice(Number(e.target.value))}
            aria-label={`${t("filter.price")} — ${t("filter.priceMin")}`}
            className="top-1/2"
          />
          <input
            type="range"
            min={0}
            max={priceCeiling}
            step={PRICE_STEP}
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            aria-label={`${t("filter.price")} — ${t("filter.priceMax")}`}
            className="top-1/2"
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-sm font-semibold text-brand-700">
          <span>{formatPrice(minPrice, lang)}</span>
          <span className="text-brand-900/40">–</span>
          <span>
            {maxPrice >= priceCeiling
              ? `${formatPrice(priceCeiling, lang)}+`
              : formatPrice(maxPrice, lang)}
          </span>
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
          {/* Eskiden bölge SLUG'ı basılıyordu ("fethiye"): küçük harf, Türkçe
              karaktersiz, "villa" kelimesi yok — sayfanın en güçlü on-page
              sinyali boşa gidiyordu. */}
          {regionLabel
            ? `${regionLabel} ${t("list.titleRegion")}`
            : t("list.title")}
        </h1>
        <p aria-live="polite" aria-atomic="true" className="mt-1 text-brand-900/80">
          {total} {t("list.results")}
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
            <>
              <ul className="grid list-none gap-6 p-0 sm:grid-cols-2 xl:grid-cols-3">
                {results.map((v, i) => (
                  <li key={v.slug}>
                    {/* Yalnızca ilk satır öncelikli: 24 kartın hepsi preload
                        edilirse hiçbiri öncelikli olmaz ve LCP bozulur. */}
                    <VillaCard villa={v} eager={i < 3} context={cardContext} />
                  </li>
                ))}
              </ul>

              {pageCount > 1 && (
                <nav
                  aria-label="Sayfalar"
                  className="mt-10 flex items-center justify-center gap-2"
                >
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => applyFilters({ sayfa: page - 1 })}
                    className="rounded-lg border border-sand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("list.prevPage")}
                  </button>
                  <span className="px-3 text-sm font-semibold text-brand-900/80">
                    {page} / {pageCount}
                  </span>
                  <button
                    type="button"
                    disabled={page >= pageCount}
                    onClick={() => applyFilters({ sayfa: page + 1 })}
                    className="rounded-lg border border-sand-200 px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-sand-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("list.nextPage")}
                  </button>
                </nav>
              )}
            </>
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
