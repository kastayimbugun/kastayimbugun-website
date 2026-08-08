/**
 * Villa detay sayfasının site geneli görünürlük tercihleri.
 *
 * `site_settings.villa_detail_prefs` (jsonb) içinde tutulur. Hem sunucu veri
 * katmanı (data/site.ts) hem de istemci bileşeni (VillaDetailClient) bu tipi ve
 * `resolveVillaDetailPrefs`'i kullandığı için burası `server-only` DEĞİLDİR.
 *
 * Kayıt yoksa ya da eksikse: her şey açık kabul edilir — yeni bir alan eklenince
 * eski kayıtlar onu otomatik "açık" görsün diye varsayılan hep `true`.
 */

/** "Benzer Villalar" bloğunun nasıl dolacağı. */
export type SimilarMode = "similar" | "category" | "off";

export interface VillaDetailPrefs {
  /** Üstteki bilgi şeridi kutuları (isteğe bağlı; boş alan zaten gizli). */
  facts: {
    capacity: boolean;
    bedrooms: boolean;
    bathrooms: boolean;
    size: boolean;
    distanceToSea: boolean;
    pool: boolean;
    rating: boolean;
    minNights: boolean;
    checkInOut: boolean;
  };
  /** Sayfa bölümleri (başlıklarıyla birlikte gizlenir). */
  sections: {
    overview: boolean;
    amenities: boolean;
    availability: boolean;
    distances: boolean;
    video: boolean;
    priceTable: boolean;
    location: boolean;
  };
  similar: {
    mode: SimilarMode;
    /** mode === "category" iken hangi kategori. */
    categorySlug: string | null;
  };
}

export const DEFAULT_VILLA_DETAIL_PREFS: VillaDetailPrefs = {
  facts: {
    capacity: true,
    bedrooms: true,
    bathrooms: true,
    size: true,
    distanceToSea: true,
    pool: true,
    rating: true,
    minNights: true,
    checkInOut: true,
  },
  sections: {
    overview: true,
    amenities: true,
    availability: true,
    distances: true,
    video: true,
    priceTable: true,
    location: true,
  },
  similar: { mode: "similar", categorySlug: null },
};

/** Yalnızca `false` gizler; eksik/bozuk her değer varsayılana (açık) düşer. */
function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/**
 * DB'den gelen ham jsonb'yi (null olabilir) tam bir `VillaDetailPrefs`'e çözer.
 * Varsayılanlarla derin birleştirme yapar; bilinmeyen anahtarları yok sayar.
 */
export function resolveVillaDetailPrefs(raw: unknown): VillaDetailPrefs {
  const d = DEFAULT_VILLA_DETAIL_PREFS;
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const facts = (r.facts ?? {}) as Record<string, unknown>;
  const sections = (r.sections ?? {}) as Record<string, unknown>;
  const similar = (r.similar ?? {}) as Record<string, unknown>;

  const mode: SimilarMode =
    similar.mode === "category" || similar.mode === "off"
      ? similar.mode
      : "similar";

  return {
    facts: {
      capacity: bool(facts.capacity, d.facts.capacity),
      bedrooms: bool(facts.bedrooms, d.facts.bedrooms),
      bathrooms: bool(facts.bathrooms, d.facts.bathrooms),
      size: bool(facts.size, d.facts.size),
      distanceToSea: bool(facts.distanceToSea, d.facts.distanceToSea),
      pool: bool(facts.pool, d.facts.pool),
      rating: bool(facts.rating, d.facts.rating),
      minNights: bool(facts.minNights, d.facts.minNights),
      checkInOut: bool(facts.checkInOut, d.facts.checkInOut),
    },
    sections: {
      overview: bool(sections.overview, d.sections.overview),
      amenities: bool(sections.amenities, d.sections.amenities),
      availability: bool(sections.availability, d.sections.availability),
      distances: bool(sections.distances, d.sections.distances),
      video: bool(sections.video, d.sections.video),
      priceTable: bool(sections.priceTable, d.sections.priceTable),
      location: bool(sections.location, d.sections.location),
    },
    similar: {
      mode,
      categorySlug:
        typeof similar.categorySlug === "string" ? similar.categorySlug : null,
    },
  };
}
