"use client";

import Link from "next/link";
import { ArrowRight, CalendarCheck, CreditCard, RefreshCw } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/** Taksit yapılabilen kartlar — demo amaçlı metin rozetleri. */
const cards = ["bonus", "World", "Maximum", "Paraf", "Axess", "CardFinans"];

/**
 * Erken Rezervasyon reklam alanı.
 * - Masaüstü: yatay banner (tam genişlik)
 * - Mobil: dikey banner (1080x1350 → 4/5 oran)
 * Görsel yerine CSS ile tasarlandı; istenirse <Image>/<video> ile değiştirilebilir.
 */
export default function AdBanner() {
  const { lang } = useI18n();
  const tr = lang === "tr";

  const copy = {
    heading: tr
      ? "En Büyük Avantajlar Erken Rezervasyonda!"
      : "The Biggest Advantages Are in Early Booking!",
    badge1: tr ? "ERKEN" : "EARLY",
    badge2: tr ? "REZERVASYON" : "BOOKING",
    installment: tr ? "12 Aya Kadar Taksit İmkanı" : "Up to 12 Months Installments",
    payNow: tr ? "%20'sini Şimdi" : "Pay 20% Now",
    payRest: tr ? "Kalanını Girişte Öde!" : "Rest at Check-in!",
    freeChange: tr
      ? "Ücretsiz Tarih & Villa Değişikliği"
      : "Free Date & Villa Change",
    note: tr
      ? "Girişe 30 gün kalana kadar değişiklik yapabilirsiniz."
      : "You can make changes up to 30 days before check-in.",
    cta: tr ? "Fırsatları Gör" : "See Deals",
    brand: tr ? "Kastayım Bugün Villaları" : "Kastayım Bugün Villas",
  };

  const chips = (
    <div className="flex flex-wrap items-center gap-1.5">
      {cards.map((c) => (
        <span
          key={c}
          className="rounded bg-white/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-brand-800"
        >
          {c}
        </span>
      ))}
    </div>
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h2 className="text-center text-xl font-extrabold text-brand-950 sm:text-2xl">
        {copy.heading}
      </h2>

      {/* ---------- MASAÜSTÜ: YATAY ---------- */}
      <Link
        href="/villalar"
        className="group relative mt-5 hidden overflow-hidden rounded-2xl bg-gradient-to-r from-sun-400 via-sun-500 to-sun-600 sm:block"
      >
        {/* dekoratif daireler */}
        <span className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/15" />
        <span className="pointer-events-none absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />

        <div className="relative flex items-center justify-between gap-6 px-7 py-6">
          {/* Sol: taksit */}
          <div className="shrink-0">
            <div className="flex items-center gap-2 text-lg font-extrabold text-white lg:text-xl">
              <CreditCard className="h-5 w-5" />
              {copy.installment}
            </div>
            <div className="mt-2.5">{chips}</div>
          </div>

          {/* Orta: ödeme + değişiklik */}
          <div className="min-w-0 text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="rounded-lg bg-brand-950 px-3 py-1.5 text-sm font-extrabold text-white lg:text-base">
                {copy.payNow}
              </span>
              <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-extrabold text-brand-950 lg:text-base">
                {copy.payRest}
              </span>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-xl font-extrabold text-white lg:text-2xl">
              <RefreshCw className="h-5 w-5 shrink-0" />
              {copy.freeChange}
            </div>
            <div className="mt-1 text-[11px] italic text-white/85">
              ***{copy.note}
            </div>
          </div>

          {/* Sağ: rozet */}
          <div className="shrink-0 -rotate-6 rounded-xl bg-white px-4 py-2.5 text-center shadow-lg transition group-hover:-rotate-3">
            <div className="text-base font-black leading-none tracking-tight text-sun-600 lg:text-lg">
              {copy.badge1}
            </div>
            <div className="text-base font-black leading-none tracking-tight text-sun-600 lg:text-lg">
              {copy.badge2}
            </div>
            <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-bold text-brand-900">
              {copy.cta} <ArrowRight className="h-3 w-3" />
            </div>
          </div>
        </div>
      </Link>

      {/* ---------- MOBİL: DİKEY (1080x1350 → 4/5) ---------- */}
      <Link
        href="/villalar"
        className="relative mt-5 block aspect-[4/5] overflow-hidden rounded-2xl bg-gradient-to-b from-sun-400 via-sun-500 to-sun-600 sm:hidden"
      >
        {/* dekoratif daireler */}
        <span className="pointer-events-none absolute -right-20 -top-16 h-64 w-64 rounded-full bg-white/15" />
        <span className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-white/10" />

        <div className="relative flex h-full flex-col items-center justify-between px-6 py-7 text-center">
          {/* Marka */}
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/90">
            {copy.brand}
          </div>

          {/* Rozet */}
          <div className="-rotate-6 rounded-2xl bg-white px-6 py-4 shadow-xl">
            <div className="text-2xl font-black leading-none tracking-tight text-sun-600">
              {copy.badge1}
            </div>
            <div className="text-2xl font-black leading-none tracking-tight text-sun-600">
              {copy.badge2}
            </div>
          </div>

          {/* Avantajlar */}
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-lg font-extrabold text-white">
              <CreditCard className="h-5 w-5 shrink-0" />
              {copy.installment}
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <span className="rounded-lg bg-brand-950 px-3 py-1.5 text-sm font-extrabold text-white">
                {copy.payNow}
              </span>
              <span className="rounded-lg bg-white px-3 py-1.5 text-sm font-extrabold text-brand-950">
                {copy.payRest}
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 text-lg font-extrabold text-white">
              <RefreshCw className="h-5 w-5 shrink-0" />
              {copy.freeChange}
            </div>
            <div className="text-[11px] italic leading-snug text-white/85">
              ***{copy.note}
            </div>
          </div>

          {/* Kartlar */}
          <div className="flex justify-center">{chips}</div>

          {/* CTA */}
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-950 px-6 py-3 text-sm font-bold text-white">
            <CalendarCheck className="h-4 w-4" />
            {copy.cta}
            <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </section>
  );
}
