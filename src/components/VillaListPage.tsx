import VillaListClient from "@/components/VillaListClient";
import {
  getRegions,
  getVillaCardPage,
  getVillaPriceCeiling,
  type VillaListQuery,
  type VillaSort,
} from "@/lib/data/villas";
import { getCategories } from "@/lib/data/categories";
import type { AmenityKey } from "@/lib/types";

/**
 * Villa listesinin SUNUCU tarafı — dört rota (`/villalar`, `/villalar/[city]`,
 * `/villalar/[city]/[region]`, `/villalar/[...location]`) bunu paylaşır.
 *
 * Filtreleme, sıralama ve sayfalama burada (SQL'de) yapılır; istemci bileşeni
 * yalnızca filtre arayüzünü ve hazır 24 kartı alır. Önceki hâlde tüm katalog
 * istemciye gönderiliyor ve filtreleme her tuş vuruşunda tarayıcıda çalışıyordu.
 */

const SORTS = new Set<VillaSort>(["featured", "priceAsc", "priceDesc", "rating"]);

type RawParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

const num = (v: string | string[] | undefined): number | undefined => {
  const n = Number(one(v));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** URL parametrelerini güvenli bir sorguya çevirir (ARCHITECTURE.md §3). */
export function parseVillaQuery(raw: RawParams): VillaListQuery {
  const ozellikRaw = raw.ozellik;
  const ozellik = (
    Array.isArray(ozellikRaw) ? ozellikRaw : ozellikRaw ? [ozellikRaw] : []
  ).slice(0, 12) as AmenityKey[];

  const siralaRaw = one(raw.sirala) as VillaSort | undefined;

  // Tarih: `giris`/`cikis` kanonik; `in`/`out` SearchBar'ın ürettiği eski adlar.
  const iso = (v: string | string[] | undefined) => {
    const s = one(v);
    return s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : undefined;
  };
  const giris = iso(raw.giris) ?? iso(raw.in);
  const cikis = iso(raw.cikis) ?? iso(raw.out);

  return {
    bolge: one(raw.bolge),
    // Çıkış girişten sonra değilse ikisini de yok say (yarı-açık aralık).
    giris: giris && cikis && cikis > giris ? giris : undefined,
    cikis: giris && cikis && cikis > giris ? cikis : undefined,
    // Kategori bağlantıları hâlâ `?category=` üretiyor; ikisini de kabul et.
    kategori: one(raw.kategori) ?? one(raw.category),
    q: one(raw.q)?.slice(0, 80),
    kisi: num(raw.kisi) ?? num(raw.guests),
    yatak: num(raw.yatak),
    maxFiyat: num(raw.maxFiyat),
    ozellik: ozellik.length ? ozellik : undefined,
    sirala: siralaRaw && SORTS.has(siralaRaw) ? siralaRaw : undefined,
    sayfa: num(raw.sayfa),
  };
}

export default async function VillaListPage({
  searchParams,
  regionSlug,
}: {
  searchParams: Promise<RawParams>;
  /** Rota segmentinden gelen bölge (URL query'sini ezer). */
  regionSlug?: string;
}) {
  const raw = await searchParams;
  const query = parseVillaQuery(raw);
  if (regionSlug) query.bolge = regionSlug;

  const [regions, categories, priceCeiling] = await Promise.all([
    getRegions(),
    getCategories(),
    getVillaPriceCeiling(),
  ]);

  // Kategori filtresi villa slug listesi üzerinden çalışıyor (villa_categories
  // bağını burada ikinci kez sorgulamamak için `getCategories` sonucundan alınır).
  const category = query.kategori
    ? categories.find((c) => c.slug === query.kategori)
    : undefined;

  const pageData = await getVillaCardPage(
    query,
    regions,
    query.kategori ? (category?.villaSlugs ?? []) : undefined
  );

  const regionObj = query.bolge
    ? regions.find((r) => r.slug === query.bolge || r.name === query.bolge)
    : undefined;

  return (
    <VillaListClient
      items={pageData.items}
      total={pageData.total}
      page={pageData.page}
      pageCount={pageData.pageCount}
      query={query}
      priceCeiling={priceCeiling}
      regionLabel={regionObj?.name}
      regions={regions}
    />
  );
}
