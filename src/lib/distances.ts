import {
  UtensilsCrossed,
  ShoppingCart,
  Umbrella,
  Plane,
  Bus,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { Villa } from "./types";
import type { Lang } from "./i18n";

/**
 * Villa detayındaki "mesafe cetveli".
 *
 * Değerler panelden girilir (`0005_distance_facts.sql`). Girilmemiş bir alan
 * için satır ÜRETİLMEZ — misafire tahmini sayı göstermek, hiç göstermemekten
 * kötüdür. (Bu dosyanın önceki sürümü mesafeleri villa slug'ından türetilen
 * sahte sayılarla üretiyordu; bkz. docs/harita-mesafe-arastirmasi.md §0.)
 *
 * Havaalanı, bölge düzeyinde sabit olduğu için aşağıdaki tablodan gelir; villa
 * kaydında kendi değeri varsa o kazanır.
 */

export interface DistanceItem {
  icon: LucideIcon;
  label: string;
  detail?: string;
  value: string;
}

const T: Record<string, { tr: string; en: string }> = {
  restaurant: { tr: "Restoran", en: "Restaurant" },
  market: { tr: "Market", en: "Market" },
  beach: { tr: "Plaj", en: "Beach" },
  center: { tr: "Merkez", en: "Town Center" },
  airport: { tr: "Hava Alanı", en: "Airport" },
  busTerminal: { tr: "Otobüs Terminali", en: "Bus Terminal" },
};

const airportsByRegion: Record<string, { name: string; km: number }[]> = {
  Kalkan: [{ name: "Dalaman", km: 140 }, { name: "Antalya", km: 200 }],
  Kaş: [{ name: "Dalaman", km: 150 }, { name: "Antalya", km: 190 }],
  İslamlar: [{ name: "Dalaman", km: 145 }, { name: "Antalya", km: 195 }],
  Fethiye: [{ name: "Dalaman", km: 50 }, { name: "Antalya", km: 210 }],
  Göcek: [{ name: "Dalaman", km: 25 }, { name: "Antalya", km: 230 }],
  Bodrum: [{ name: "Milas-Bodrum", km: 36 }, { name: "Dalaman", km: 250 }],
};

/** Metreyi "850 m" / "1.4 km" biçiminde yazar. */
function formatMeters(m: number) {
  return m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1)} km`;
}

export function villaDistances(villa: Villa, lang: Lang): DistanceItem[] {
  const L = (k: string) => T[k][lang];
  const items: DistanceItem[] = [];

  /** Değer girilmemişse (null/undefined) satır eklenmez. */
  const push = (
    icon: LucideIcon,
    label: string,
    km: number | null | undefined,
    detail?: string
  ) => {
    if (km == null) return;
    items.push({ icon, label, detail, value: `${km} km` });
  };

  push(UtensilsCrossed, L("restaurant"), villa.distanceRestaurantKm);
  push(ShoppingCart, L("market"), villa.distanceMarketKm);

  // Denize uzaklık metre cinsinden ayrı bir alanda tutuluyor ve her villada dolu.
  if (villa.distanceToSea > 0) {
    items.push({
      icon: Umbrella,
      label: L("beach"),
      detail: villa.region,
      value: formatMeters(villa.distanceToSea),
    });
  }

  push(Landmark, L("center"), villa.distanceCenterKm, villa.region);

  const airports = airportsByRegion[villa.region];
  if (villa.distanceAirportKm != null) {
    // Villaya özel değer girilmişse bölge tablosunun önüne geçer.
    push(Plane, L("airport"), villa.distanceAirportKm, airports?.[0]?.name);
  } else if (airports) {
    for (const a of airports) {
      items.push({
        icon: Plane,
        label: L("airport"),
        detail: a.name,
        value: `${a.km} km`,
      });
    }
  }

  push(Bus, L("busTerminal"), villa.distanceTransitKm, villa.region);

  return items;
}
