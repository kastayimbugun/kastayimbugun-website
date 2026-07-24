"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toISO, formatPriceShort } from "@/lib/format";
import {
  isBooked,
  isPast,
  monthMatrix,
  priceForDate,
  type Range,
} from "@/lib/availability";

type Season = { start: string; end: string; price: number };

interface Props {
  bookedRanges: Range[];
  checkIn: string | null;
  checkOut: string | null;
  onDayClick: (iso: string) => void;
  months?: number;
  seasons?: Season[];
  discountPercent?: number;
}

export default function AvailabilityCalendar({
  bookedRanges,
  checkIn,
  checkOut,
  onDayClick,
  months = 2,
  seasons = [],
  discountPercent,
}: Props) {
  const { lang } = useI18n();
  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const weekDays =
    lang === "tr"
      ? ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]
      : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const monthName = (d: Date) =>
    new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
      month: "long",
      year: "numeric",
    }).format(d);

  const shift = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const legend = [
    { cls: "bg-white ring-1 ring-sand-200", label: lang === "tr" ? "Müsait" : "Available" },
    { cls: "bg-brand-600", label: lang === "tr" ? "Seçili" : "Selected" },
    { cls: "bg-rose-100 ring-1 ring-rose-200", label: lang === "tr" ? "Dolu" : "Booked" },
  ];

  const renderMonth = (offset: number) => {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
    const weeks = monthMatrix(d.getFullYear(), d.getMonth());

    return (
      <div key={offset} className="flex-1">
        <div className="mb-3 text-center text-sm font-bold text-brand-950">
          {monthName(d)}
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-brand-900/40">
          {weekDays.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {weeks.flat().map((day, i) => {
            if (!day) return <div key={i} />;
            const iso = toISO(day);
            const past = isPast(iso);
            const booked = isBooked(iso, bookedRanges);
            const disabled = past || booked;

            const isStart = iso === checkIn;
            const isEnd = iso === checkOut;
            const inRange =
              checkIn && checkOut && iso > checkIn && iso < checkOut;
            const selected = isStart || isEnd;

            const base = priceForDate(iso, seasons);
            const showPrice = base != null && !disabled;
            const hasDiscount = showPrice && !!discountPercent;
            const discounted = hasDiscount
              ? Math.round(base! * (1 - discountPercent! / 100))
              : null;

            let cls =
              "text-brand-900 hover:bg-brand-50 hover:ring-1 hover:ring-brand-300";
            let priceCls = "text-brand-900/45";
            if (booked) {
              cls = "bg-rose-50 text-rose-300 line-through cursor-not-allowed";
            } else if (past) {
              cls = "text-brand-900/25 cursor-not-allowed";
            } else if (selected) {
              cls = "bg-brand-600 text-white font-bold";
              priceCls = "text-white/80";
            } else if (inRange) {
              cls = "bg-brand-100 text-brand-800";
              priceCls = "text-brand-700/70";
            }

            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onDayClick(iso)}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-sm transition ${cls}`}
              >
                <span className="leading-none">{day.getDate()}</span>
                {showPrice &&
                  (hasDiscount ? (
                    <span className="flex flex-col items-center leading-none">
                      <span
                        className={`text-[8px] line-through ${
                          selected ? "text-white/60" : "text-brand-900/30"
                        }`}
                      >
                        {formatPriceShort(base!, lang)}
                      </span>
                      <span
                        className={`text-[10px] font-semibold ${
                          selected ? "text-white" : "text-rose-600"
                        }`}
                      >
                        {formatPriceShort(discounted!, lang)}
                      </span>
                    </span>
                  ) : (
                    <span className={`text-[10px] font-medium ${priceCls}`}>
                      {formatPriceShort(base!, lang)}
                    </span>
                  ))}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => shift(-1)}
          disabled={
            cursor.getFullYear() === today.getFullYear() &&
            cursor.getMonth() === today.getMonth()
          }
          className="rounded-full p-2 text-brand-700 transition hover:bg-brand-50 disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-brand-900/60">
          {legend.map((l) => (
            <span key={l.label} className="inline-flex items-center gap-1.5">
              <span className={`h-3.5 w-3.5 rounded ${l.cls}`} />
              {l.label}
            </span>
          ))}
        </div>
        <button
          onClick={() => shift(1)}
          className="rounded-full p-2 text-brand-700 transition hover:bg-brand-50"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-col gap-6 sm:flex-row">
        {Array.from({ length: months }, (_, i) => renderMonth(i))}
      </div>
    </div>
  );
}
