import type { Lang } from "./i18n";

export function formatPrice(value: number, lang: Lang = "tr") {
  return new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Takvim hücreleri için kısa fiyat, ör. "8.500₺". */
export function formatPriceShort(value: number, lang: Lang = "tr") {
  return (
    new Intl.NumberFormat(lang === "tr" ? "tr-TR" : "en-US").format(value) + "₺"
  );
}

export function formatDate(iso: string, lang: Lang = "tr") {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function formatDateShort(iso: string, lang: Lang = "tr") {
  const d = new Date(iso + "T00:00:00");
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
  }).format(d);
}

/**
 * Kısa ama YILLI tarih aralığı, ör. "3 – 8 Ağu 2026", "28 Ağu – 3 Eyl 2026".
 * Panelde giriş-çıkış gösteriminde yıl şart: farklı yılların (2026/2027)
 * talepleri ayırt edilebilsin (yol haritası 4.4).
 */
export function formatDateRange(startIso: string, endIso: string, lang: Lang = "tr") {
  const locale = lang === "tr" ? "tr-TR" : "en-US";
  const a = new Date(startIso + "T00:00:00");
  const b = new Date(endIso + "T00:00:00");
  const yearB = new Intl.DateTimeFormat(locale, { year: "numeric" }).format(b);

  // Aynı yıl: yılı yalnızca sonda göster. Farklı yıl: ikisini de tam yaz.
  if (a.getFullYear() !== b.getFullYear()) {
    return `${formatDate(startIso, lang)} – ${formatDate(endIso, lang)}`;
  }
  return `${formatDateShort(startIso, lang)} – ${formatDateShort(endIso, lang)} ${yearB}`;
}

/**
 * Tam zaman damgası, ör. "3 Ağu 2026 14:20".
 *
 * Saat dilimi bilerek Europe/Istanbul'a sabitlenir: sayfa sunucuda render
 * ediliyor ve Vercel UTC çalışıyor — sabitlenmezse acente saatleri 3 saat
 * geride görür. Talep tarihinde yıl ve saat şart (farklı yılların talepleri
 * ayırt edilebilsin, yanıt süresi hesaplanabilsin).
 */
export function formatDateTime(iso: string, lang: Lang = "tr") {
  return new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}

/** yyyy-mm-dd for a Date, in local time. */
export function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function nightsBetween(start: string, end: string) {
  const a = new Date(start + "T00:00:00").getTime();
  const b = new Date(end + "T00:00:00").getTime();
  return Math.max(0, Math.round((b - a) / 86400000));
}
