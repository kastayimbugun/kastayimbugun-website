import type { Villa } from "./types";
import { nightsBetween, toISO } from "./format";
import { priceForDate } from "./availability";

// Fiyat hesabı — SAF fonksiyon, tek doğruluk kaynağı.
// İstemci gösterimi ve sunucu doğrulaması AYNI fonksiyonu çağırır
// (ARCHITECTURE.md §4: kritik tutarlar sunucuda hesaplanır, istemcideki rakam sadece gösterim).

export interface PriceBreakdown {
  nights: number;
  nightlyAvg: number;
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  total: number;
  currency: string;
}

export function calcPrice(
  villa: Villa,
  checkIn: string,
  checkOut: string
): PriceBreakdown {
  const nights = nightsBetween(checkIn, checkOut);
  const currency = "TRY";

  // Geçersiz/boş aralık: parasal alanların tümü 0.
  // nightlyAvg gösterim için gecelik taban fiyatı taşıyabilir.
  if (nights <= 0) {
    return {
      nights: 0,
      nightlyAvg: villa.pricePerNight,
      subtotal: 0,
      cleaningFee: 0,
      serviceFee: 0,
      total: 0,
      currency,
    };
  }

  // Her gece için o güne düşen sezon fiyatını topla; sezon yoksa taban fiyat.
  // Saat dilimi kaymasını önlemek için yerel gece yarısından başla ve
  // günü setDate(getDate()+i) ile güvenli biçimde ilerlet (getTime()+86400000 DEĞİL).
  let subtotal = 0;
  const start = new Date(checkIn + "T00:00:00");
  for (let i = 0; i < nights; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISO(d);
    subtotal += priceForDate(iso, villa.seasons) ?? villa.pricePerNight;
  }

  const nightlyAvg = Math.round(subtotal / nights);
  const cleaningFee = villa.cleaningFee ?? 0;
  const serviceRate = villa.serviceRate ?? 0.05;
  const serviceFee = Math.round(subtotal * serviceRate);
  const total = subtotal + cleaningFee + serviceFee;

  return {
    nights,
    nightlyAvg,
    subtotal,
    cleaningFee,
    serviceFee,
    total,
    currency,
  };
}
