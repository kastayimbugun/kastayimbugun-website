/**
 * Panel tasarım belirteçleri — tek kaynak (docs/panel-kurallari.md §5).
 *
 * Bu dosyadan önce aynı input sınıf dizesi 9 ayrı yerde, birincil buton 7 ayrı
 * yerde tekrar ediyordu ve varyantlar birbirinden sapmaya başlamıştı.
 *
 * Kontrast notu: ikincil metinlerde `text-brand-900/70` alt sınırdır
 * (beyaz üzerinde ≈4.7:1, WCAG AA). Daha soluk tonlar (`/55`, `/45`, `/40`)
 * AA'yı geçmez; yalnızca devre dışı/dekoratif öğelerde kullanılır.
 */

export const inputCls =
  "w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm text-brand-950 outline-none transition placeholder:text-brand-900/45 focus:border-brand-500 focus:ring-2 focus:ring-brand-300 disabled:bg-sand-50 disabled:text-brand-900/50";

export const labelCls = "mb-1 block text-xs font-semibold text-brand-900/70";

export const hintCls = "mt-1 block text-[11px] leading-snug text-brand-900/70";

export const errorCls =
  "mt-1 block text-[11px] font-semibold leading-snug text-rose-700";

/** Sayfa/bölüm kartı. */
export const cardCls = "rounded-2xl border border-sand-200 bg-white";

/** İkincil metin — AA sınırında. */
export const mutedCls = "text-brand-900/70";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-sun-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-sun-600 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-brand-900/50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-sand-200 bg-white px-4 py-2 text-sm font-semibold text-brand-800 transition hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50";

export const btnDanger =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-rose-700 focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50";

/** İkon-only buton (her zaman aria-label ile birlikte kullanılır). */
export const btnIcon =
  "rounded-lg p-1.5 text-brand-800 transition hover:bg-sand-100 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-30";

export const btnIconDanger =
  "rounded-lg p-1.5 text-brand-900/60 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-40";
