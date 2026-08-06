"use client";

import { useMemo, useState } from "react";
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
  /**
   * Dolu günün üzerine gelince gösterilecek not (ör. "Kime kapatıldı").
   * YALNIZCA panelde geçilir — herkese açık sitede geçilmez (gizlilik).
   */
  getBookedNote?: (iso: string) => string | null;
  /**
   * Elle kapatılmış tarih aralıkları. `bookedRanges`'ten ayrı: bunlar kilitli
   * DEĞİL — mavi görünür ve aralık seçimine (onDayClick) dahildir, böylece
   * birkaç kapalı gün seçilip toplu açılabilir.
   * YALNIZCA panelde (BlockEditor) geçilir; herkese açık sitede boş kalır, o
   * yüzden tüm bloklar `bookedRanges` üzerinden kilitli görünmeye devam eder.
   */
  closedRanges?: Range[];
}

export default function AvailabilityCalendar({
  bookedRanges,
  checkIn,
  checkOut,
  onDayClick,
  months = 2,
  seasons = [],
  discountPercent,
  getBookedNote,
  closedRanges = [],
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

  // Changeover (yarım gün) için rezervasyon sınırları: bir aralığın giriş günü
  // (start) öğleden sonra dolu, çıkış günü (end) öğleden önce dolu. Yarı-açık
  // [start, end) modeli gereği çıkış günü yeni girişe müsaittir — o gün çıkan
  // birinin yerine giriş yapılabilir (villacılıkta standart).
  const { startSet, endSet } = useMemo(() => {
    const s = new Set<string>();
    const e = new Set<string>();
    for (const r of bookedRanges) {
      s.add(r.start);
      e.add(r.end);
    }
    return { startSet: s, endSet: e };
  }, [bookedRanges]);

  // Köşegen yarım-gün arka planı (rose-200).
  const halfBg = (side: "checkin" | "checkout") =>
    side === "checkin"
      ? // Giriş günü: öğleden sonra (sağ-alt üçgen) dolu
        "linear-gradient(135deg, transparent 0 50%, rgb(254 205 211) 50% 100%)"
      : // Çıkış günü: öğleden önce (sol-üst üçgen) dolu
        "linear-gradient(135deg, rgb(254 205 211) 0 50%, transparent 50% 100%)";

  const legend = [
    { cls: "bg-white ring-1 ring-sand-200", label: lang === "tr" ? "Müsait" : "Available" },
    { cls: "bg-brand-600", label: lang === "tr" ? "Seçili" : "Selected" },
    { cls: "bg-rose-100 ring-1 ring-rose-200", label: lang === "tr" ? "Dolu" : "Booked" },
    {
      cls: "ring-1 ring-rose-200",
      style: { backgroundImage: halfBg("checkout") },
      label: lang === "tr" ? "Giriş/çıkış günü" : "Change-over",
    },
    // "Kapalı" göstergesi yalnızca elle kapatma aralığı geçildiğinde (panelde).
    ...(closedRanges.length > 0
      ? [
          {
            cls: "bg-brand-100 ring-1 ring-brand-300",
            label: lang === "tr" ? "Kapalı (seç-aç)" : "Closed",
          },
        ]
      : []),
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
            const occupied = isBooked(iso, bookedRanges); // start ≤ iso < end
            // Elle kapatılmış gün: kilitli DEĞİL — aralık seçimine dahil,
            // seçilip toplu açılabilir (onDayClick üzerinden).
            const closed = isBooked(iso, closedRanges);

            // Changeover analizi.
            const isCheckinDay = startSet.has(iso);
            const isCheckoutDay = endSet.has(iso);
            const middleNight = occupied && !isCheckinDay; // tam dolu geceler
            const fullRed = middleNight || (isCheckinDay && isCheckoutDay);
            // Giriş günü (PM dolu): seçilemez (occupied). Çıkış günü (AM dolu):
            // yeni girişe açık, seçilebilir.
            const checkinHalf = isCheckinDay && !isCheckoutDay && !middleNight;
            const checkoutHalf = isCheckoutDay && !isCheckinDay && !middleNight;

            const disabled = past || occupied;

            const isStart = iso === checkIn;
            const isEnd = iso === checkOut;
            const inRange =
              checkIn && checkOut && iso > checkIn && iso < checkOut;
            const selected = isStart || isEnd;

            const bookedNote =
              occupied || closed || isCheckoutDay
                ? getBookedNote?.(iso) ?? null
                : null;
            const base = priceForDate(iso, seasons);
            const showPrice = base != null && !disabled && !closed;
            const hasDiscount = showPrice && !!discountPercent;
            const discounted = hasDiscount
              ? Math.round(base! * (1 - discountPercent! / 100))
              : null;

            let cls =
              "text-brand-900 hover:bg-brand-50 hover:ring-1 hover:ring-brand-300";
            let priceCls = "text-brand-900/45";
            let halfStyle: React.CSSProperties | undefined;
            // Seçim vurgusu her şeyin üstünde: seçili/aralık içi kapalı günü de
            // sarmalar, böylece "seç → aç" görsel geri bildirimi net olur.
            if (selected) {
              cls = "bg-brand-600 text-white font-bold";
              priceCls = "text-white/80";
            } else if (inRange) {
              cls = "bg-brand-200 text-brand-800";
              priceCls = "text-brand-700/70";
            } else if (closed) {
              // Elle kapatma: mavi ton, üstü çizili değil, seçilebilir.
              cls =
                "bg-brand-100 text-brand-700 ring-1 ring-brand-300 hover:bg-brand-200 cursor-pointer";
            } else if (fullRed) {
              cls = "bg-rose-50 text-rose-300 line-through cursor-not-allowed";
            } else if (checkinHalf) {
              // Giriş günü — sağ-alt yarısı dolu, seçilemez.
              cls = "text-brand-900/70 cursor-not-allowed";
              halfStyle = { backgroundImage: halfBg("checkin") };
            } else if (checkoutHalf) {
              // Çıkış günü — sol-üst yarısı dolu ama yeni girişe açık.
              cls = "text-brand-900 hover:ring-1 hover:ring-brand-300";
              halfStyle = { backgroundImage: halfBg("checkout") };
            } else if (past) {
              cls = "text-brand-900/25 cursor-not-allowed";
            }

            return (
              <button
                key={i}
                disabled={disabled}
                onClick={() => onDayClick(iso)}
                style={halfStyle}
                title={
                  closed
                    ? (bookedNote ? bookedNote + " · " : "") +
                      (lang === "tr" ? "Seçip açabilirsiniz" : "Select to reopen")
                    : checkoutHalf
                      ? lang === "tr"
                        ? "Çıkış günü — bu tarihe giriş yapılabilir"
                        : "Check-out day — available for check-in"
                      : checkinHalf
                        ? lang === "tr"
                          ? "Giriş günü"
                          : "Check-in day"
                        : (bookedNote ?? undefined)
                }
                className={`relative flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-sm transition ${cls}`}
              >
                {bookedNote && (
                  <span
                    className={`absolute right-1 top-1 h-1.5 w-1.5 rounded-full ${
                      closed ? "bg-brand-500" : "bg-rose-400"
                    }`}
                  />
                )}
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
              <span
                className={`h-3.5 w-3.5 rounded ${l.cls}`}
                style={"style" in l ? l.style : undefined}
              />
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
