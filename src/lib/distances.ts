import {
  UtensilsCrossed,
  ShoppingCart,
  Umbrella,
  Plane,
  Bus,
  Pill,
  Fuel,
  Landmark,
  type LucideIcon,
} from "lucide-react";
import type { Villa } from "./types";
import type { Lang } from "./i18n";

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
  pharmacy: { tr: "Eczane", en: "Pharmacy" },
  gas: { tr: "Benzin İstasyonu", en: "Gas Station" },
};

const airportsByRegion: Record<string, { name: string; km: number }[]> = {
  Kalkan: [{ name: "Dalaman", km: 140 }, { name: "Antalya", km: 200 }],
  Kaş: [{ name: "Dalaman", km: 150 }, { name: "Antalya", km: 190 }],
  İslamlar: [{ name: "Dalaman", km: 145 }, { name: "Antalya", km: 195 }],
  Fethiye: [{ name: "Dalaman", km: 50 }, { name: "Antalya", km: 210 }],
  Göcek: [{ name: "Dalaman", km: 25 }, { name: "Antalya", km: 230 }],
  Bodrum: [{ name: "Milas-Bodrum", km: 36 }, { name: "Dalaman", km: 250 }],
};

function seedNum(slug: string) {
  return Array.from(slug).reduce((a, c) => a + c.charCodeAt(0), 0);
}

/** Villa için deterministik (slug'a bağlı, sabit) uzaklık listesi. */
export function villaDistances(villa: Villa, lang: Lang): DistanceItem[] {
  const s = seedNum(villa.slug);
  // slug'a bağlı sabit "rastgele" km değeri (min–max, tek ondalık)
  const km = (salt: number, min: number, max: number) =>
    (min + ((s * salt) % ((max - min) * 10)) / 10).toFixed(1);

  const L = (k: string) => T[k][lang];
  const beach =
    villa.distanceToSea < 1000
      ? `${villa.distanceToSea} m`
      : `${(villa.distanceToSea / 1000).toFixed(1)} km`;
  const airports =
    airportsByRegion[villa.region] ??
    [{ name: "Dalaman", km: 120 }, { name: "Antalya", km: 200 }];

  return [
    { icon: UtensilsCrossed, label: L("restaurant"), value: `${km(7, 0.3, 5)} km` },
    { icon: ShoppingCart, label: L("market"), value: `${km(11, 0.3, 4)} km` },
    { icon: Umbrella, label: L("beach"), detail: villa.region, value: beach },
    { icon: Landmark, label: L("center"), detail: villa.region, value: `${km(5, 1, 8)} km` },
    { icon: Plane, label: L("airport"), detail: airports[0].name, value: `${airports[0].km} km` },
    { icon: Plane, label: L("airport"), detail: airports[1].name, value: `${airports[1].km} km` },
    { icon: Bus, label: L("busTerminal"), detail: villa.region, value: `${km(13, 5, 25)} km` },
    { icon: Pill, label: L("pharmacy"), value: `${km(17, 0.4, 6)} km` },
    { icon: Fuel, label: L("gas"), value: `${km(19, 0.5, 7)} km` },
  ];
}
