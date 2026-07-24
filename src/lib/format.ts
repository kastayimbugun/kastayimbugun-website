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
