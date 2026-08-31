"use client";

import Link from "next/link";
import { Moon, CalendarClock, ArrowRight, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { VillaFacetCounts } from "@/lib/data/villas";

/**
  * Sayılar SABİT YAZILIYDI: 2→39, 3→90, 4→69, 5→44 villa, başlıkta "242+ villa
  * müsait". Sitede o gün 21 villa vardı. Kutucuklar da `/villalar?stay=N`'e
  * gidiyordu ama `stay` diye bir parametre hiç okunmuyordu — dördü de aynı
  * filtresiz listeyi açıyordu.
  *
  * Artık sayılar `getVillaFacetCounts()`ten (Postgres sayıyor) ve link
  * `?gece=N` gerçek bir filtre: minimum konaklaması N geceyi aşmayan villalar.
  */
export default function ShortStayDeals({ counts }: { counts: VillaFacetCounts }) {
  const { t, lang } = useI18n();
  const deals = [2, 3, 4, 5].map((nights) => ({
    nights,
    count: counts.gece[nights] ?? 0,
  }));
  // Başlıktaki rakam: en kısa konaklamayı (2 gece) kabul eden villa sayısı.
  const total = counts.gece[2] ?? 0;
  const monthName = new Intl.DateTimeFormat(
    lang === "tr" ? "tr-TR" : "en-US",
    { month: "long" }
  ).format(new Date());

  return (
    <section className="mx-auto max-w-7xl px-8 py-8 sm:px-10">
      {/* Header */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sun-100 px-3 py-1 text-sm font-semibold text-sun-700">
            <span className="text-base leading-none">⚡</span>
            {lang === "tr" ? "Fırsat" : "Deals"}
          </span>
          <h2 className="mt-4 text-2xl font-extrabold tracking-tight text-brand-950 sm:text-3xl">
            {t("deals.heading")}
          </h2>
          <p className="mt-3 leading-relaxed text-brand-900/60">
            {t("deals.desc")}
          </p>

          <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-sand-200 bg-sand-50 py-1.5 pl-2 pr-4 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-sun-600 shadow-sm">
              <CalendarClock className="h-4 w-4" />
            </span>
            <span className="font-semibold capitalize text-brand-950">
              {monthName}
            </span>
            <span className="text-brand-900/40">·</span>
            <span className="text-brand-900/60">
              {total} {t("deals.available")}
            </span>
          </div>
        </div>

        <Link
          href="/villalar"
          className="group hidden shrink-0 items-center gap-1.5 rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 sm:inline-flex"
        >
          {t("deals.cta")}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {/* Tiles */}
      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {deals.map((d) => (
          <Link
            key={d.nights}
            href={`/villalar?gece=${d.nights}`}
            className="group relative overflow-hidden rounded-2xl border border-sand-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1.5 hover:border-transparent hover:shadow-xl hover:shadow-brand-900/10"
          >
            {/* Hover gradient fill */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-600 to-brand-800 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

            {/* Big ghost number in the corner (behind content) */}
            <span
              aria-hidden
              className="pointer-events-none absolute -bottom-6 -right-2 select-none text-8xl font-black text-sand-100 transition-colors duration-300 group-hover:text-white/10"
            >
              {d.nights}
            </span>

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white">
                  <Moon className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-sand-100 px-2.5 py-1 text-xs font-bold text-brand-700 transition-colors duration-300 group-hover:bg-white/20 group-hover:text-white">
                  {d.count} {t("deals.villaCount")}
                </span>
              </div>

              <div className="mt-6 flex items-baseline gap-1.5">
                <span className="text-4xl font-black leading-none text-brand-950 transition-colors duration-300 group-hover:text-white">
                  {d.nights}
                </span>
                <span className="text-base font-semibold text-brand-900/55 transition-colors duration-300 group-hover:text-white/80">
                  {t("deals.nightUnit")}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand-600 transition-colors duration-300 group-hover:text-white">
                {t("deals.explore")}
                <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile CTA */}
      <Link
        href="/villalar"
        className="mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-sun-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sun-600 sm:hidden"
      >
        {t("deals.cta")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}
