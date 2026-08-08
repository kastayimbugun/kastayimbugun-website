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
  /** Uygulanan indirim tutarı (uzun konaklama / son dakika); yoksa 0. */
  discount: number;
  /** İndirimi açıklayan kısa etiket, ör. "7+ gece −%15". Yoksa null. */
  discountLabel: string | null;
  /** Kapasite üstü kişi ek ücreti (toplam, tüm geceler); yoksa 0. */
  extraGuestFee: number;
}

/** İsteğe bağlı fiyat kuralları — hepsi opsiyonel, tanımsızsa uygulanmaz. */
export interface PriceRules {
  /** Cuma/Cumartesi gecelerine yüzde prim. */
  weekendPremiumPercent?: number | null;
  /** 7+ gecede yüzde indirim. */
  losWeeklyDiscountPercent?: number | null;
  /** 28+ gecede yüzde indirim (haftalıkla en yükseği uygulanır). */
  losMonthlyDiscountPercent?: number | null;
  /** Girişe `lastMinuteDays` günden az kala yüzde indirim. */
  lastMinuteDiscountPercent?: number | null;
  lastMinuteDays?: number | null;
  /** `extraGuestAfter` üstü kişi başına gecelik ek ücret. */
  extraGuestFee?: number | null;
  extraGuestAfter?: number | null;
}

/**
 * `calcPrice`'ın ihtiyaç duyduğu alanlar — tüm `Villa` şekli değil. Bilerek
 * `Villa`'dan türetilmedi: `Villa["seasons"]` etiket alanları (labelTr/labelEn)
 * da taşıyor, fiyat hesabının bunlara ihtiyacı yok. Panel tarafında (manuel
 * rezervasyon formu) tam `Villa` nesnesi kurmak yerine bu dar tipi dolduran
 * hafif bir sorgu yeterli olsun diye ayrıldı. Mevcut `Villa` çağrıları
 * (BookingBox.tsx, actions/booking.ts) fazladan alan taşıdığı için sorunsuz
 * uyar — TS'te bir değişkenin daha dar bir parametre tipine geçmesi, fazla
 * alanlar için hata vermez (yalnızca nesne literalleri için "excess property"
 * kontrolü uygulanır).
 */
export interface PricingInput extends PriceRules {
  pricePerNight: number;
  cleaningFee?: number;
  serviceRate?: number;
  seasons: { start: string; end: string; price: number }[];
}

/** Fiyat hesabına dışarıdan gelen bağlam — kural uygulaması için opsiyonel. */
export interface PriceContext {
  /** Toplam kişi (yetişkin + çocuk) — kapasite üstü ücret için. */
  guests?: number;
  /** Bugünün ISO tarihi — son dakika indirimi için. Verilmezse uygulanmaz. */
  asOf?: string;
}

const pct = (v: number | null | undefined) => (v && v > 0 ? v : 0);

export function calcPrice(
  villa: PricingInput,
  checkIn: string,
  checkOut: string,
  ctx: PriceContext = {}
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
      discount: 0,
      discountLabel: null,
      extraGuestFee: 0,
    };
  }

  // Her gece için o güne düşen sezon fiyatını topla; sezon yoksa taban fiyat.
  // Cuma/Cumartesi gecesine hafta sonu primi eklenir (kural 1).
  // Saat dilimi kaymasını önlemek için yerel gece yarısından başla ve
  // günü setDate(getDate()+i) ile güvenli biçimde ilerlet (getTime()+86400000 DEĞİL).
  const weekend = pct(villa.weekendPremiumPercent);
  let subtotal = 0;
  const start = new Date(checkIn + "T00:00:00");
  for (let i = 0; i < nights; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = toISO(d);
    let nightly = priceForDate(iso, villa.seasons) ?? villa.pricePerNight;
    // getDay: 5 = Cuma, 6 = Cumartesi (o gece hafta sonu sayılır).
    const dow = d.getDay();
    if (weekend > 0 && (dow === 5 || dow === 6)) {
      nightly = nightly * (1 + weekend / 100);
    }
    subtotal += nightly;
  }
  subtotal = Math.round(subtotal);

  // Uzun konaklama indirimi (kural 2): en uygun eşik uygulanır.
  const weekly = pct(villa.losWeeklyDiscountPercent);
  const monthly = pct(villa.losMonthlyDiscountPercent);
  let discountPct = 0;
  let discountLabel: string | null = null;
  if (monthly > 0 && nights >= 28) {
    discountPct = monthly;
    discountLabel = `28+ gece −%${monthly}`;
  } else if (weekly > 0 && nights >= 7) {
    discountPct = weekly;
    discountLabel = `7+ gece −%${weekly}`;
  }

  // Son dakika indirimi (kural 3): girişe az kala, daha yüksek olanı uygular.
  const lastMinute = pct(villa.lastMinuteDiscountPercent);
  const lmDays = villa.lastMinuteDays ?? 0;
  if (ctx.asOf && lastMinute > 0 && lmDays > 0) {
    const daysUntil = nightsBetween(ctx.asOf, checkIn);
    if (daysUntil >= 0 && daysUntil <= lmDays && lastMinute > discountPct) {
      discountPct = lastMinute;
      discountLabel = `Son dakika −%${lastMinute}`;
    }
  }

  const discount = Math.round((subtotal * discountPct) / 100);
  const discountedSubtotal = subtotal - discount;

  // Kapasite üstü kişi ücreti (kural 4): eşik üstü kişi × gece.
  const efee = pct(villa.extraGuestFee);
  const after = villa.extraGuestAfter ?? 0;
  let extraGuestFee = 0;
  if (efee > 0 && after > 0 && ctx.guests && ctx.guests > after) {
    extraGuestFee = (ctx.guests - after) * efee * nights;
  }

  // Brüt gecelik ortalama (indirimsiz) — "X × N gece = subtotal" tutarlı olsun.
  const nightlyAvg = Math.round(subtotal / nights);
  const cleaningFee = villa.cleaningFee ?? 0;
  const serviceRate = villa.serviceRate ?? 0.05;
  const serviceFee = Math.round(discountedSubtotal * serviceRate);
  const total = discountedSubtotal + extraGuestFee + cleaningFee + serviceFee;

  return {
    nights,
    nightlyAvg,
    subtotal,
    cleaningFee,
    serviceFee,
    total,
    currency,
    discount,
    discountLabel,
    extraGuestFee,
  };
}
