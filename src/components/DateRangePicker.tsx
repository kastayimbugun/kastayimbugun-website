"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { toISO } from "@/lib/format";
import { isPast, monthMatrix } from "@/lib/availability";

/**
 * Arama çubuğu için tek takvimli tarih aralığı seçici (otel tarzı).
 * Giriş ve Çıkış alanları görünür kalır; ikisinden birine tıklanınca aynı
 * takvim açılır ve giriş → çıkış tek seferde seçilir. Villaya özgü fiyat/dolu
 * bilgisi YOKTUR — genel arama içindir (bugünden ileri, boş takvim).
 */
export default function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
}: {
  checkIn: string;
  checkOut: string;
  onChange: (checkIn: string, checkOut: string) => void;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  // Fareyle üzerine gelinen gün — giriş seçiliyken çıkışa kadar aralığı önizler.
  const [hovered, setHovered] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const weekDays =
    lang === "tr"
      ? ["Pt", "Sa", "Ça", "Pe", "Cu", "Ct", "Pz"]
      : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  const monthName = (d: Date) =>
    new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
      month: "long",
      year: "numeric",
    }).format(d);

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat(lang === "tr" ? "tr-TR" : "en-US", {
      day: "numeric",
      month: "short",
    }).format(new Date(iso + "T00:00:00"));

  const placeholder = lang === "tr" ? "Tarih ekle" : "Add date";

  const shift = (delta: number) =>
    setCursor((c) => new Date(c.getFullYear(), c.getMonth() + delta, 1));

  const atCurrentMonth =
    cursor.getFullYear() === today.getFullYear() &&
    cursor.getMonth() === today.getMonth();

  // Aralık seçim mantığı: başlangıç yoksa (ya da ikisi de doluysa) yeni giriş;
  // giriş varsa ve tıklanan gün sonraysa çıkış; değilse yeni giriş.
  const pick = (iso: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      onChange(iso, "");
    } else if (iso > checkIn) {
      onChange(checkIn, iso);
      setOpen(false);
    } else {
      onChange(iso, "");
    }
  };

  const renderMonth = (offset: number, extraCls = "") => {
    const d = new Date(cursor.getFullYear(), cursor.getMonth() + offset, 1);
    const weeks = monthMatrix(d.getFullYear(), d.getMonth());
    return (
      <div className={`flex-1 ${extraCls}`}>
        <div className="mb-2 text-center text-sm font-bold text-brand-950">
          {monthName(d)}
        </div>
        <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold text-brand-900/40">
          {weekDays.map((w) => (
            <div key={w}>{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {weeks.flat().map((day, i) => {
            if (!day) return <div key={i} />;
            const iso = toISO(day);
            const past = isPast(iso);
            const isStart = iso === checkIn;
            const isEnd = iso === checkOut;
            const inRange =
              checkIn && checkOut && iso > checkIn && iso < checkOut;
            const selected = isStart || isEnd;

            // Hover önizlemesi: giriş seçili, çıkış boş ve hover girişten sonra.
            const previewing =
              !!checkIn && !checkOut && !!hovered && hovered > checkIn;
            const inPreview = previewing && iso > checkIn && iso < hovered!;
            const isPreviewEnd = previewing && iso === hovered;

            const band = inRange || inPreview;
            const connectsRight = isStart && (!!checkOut || previewing);
            const connectsLeft = isEnd || isPreviewEnd;

            let cls =
              "text-brand-900 hover:bg-brand-50 hover:ring-1 hover:ring-brand-300";
            if (selected) cls = "bg-brand-600 text-white font-bold";
            else if (isPreviewEnd) cls = "bg-brand-500 text-white font-semibold";
            else if (band) cls = "bg-brand-100 text-brand-800";
            else if (past) cls = "text-brand-900/25 cursor-not-allowed";

            return (
              <button
                key={i}
                type="button"
                disabled={past}
                onClick={() => pick(iso)}
                onMouseEnter={() => !past && setHovered(iso)}
                className={`flex h-9 items-center justify-center rounded-lg text-sm transition-colors duration-150 ${cls} ${
                  band ? "rounded-none" : ""
                } ${connectsRight ? "rounded-r-none" : ""} ${
                  connectsLeft ? "rounded-l-none" : ""
                }`}
              >
                {day.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const field = (label: string, value: string, isCheckout: boolean) => (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className={`group flex flex-1 items-center gap-3 px-4 py-3 text-left transition hover:bg-sand-50 ${
        isCheckout ? "border-l border-sand-200" : ""
      }`}
    >
      <CalendarDays className="h-5 w-5 shrink-0 text-brand-500" />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-bold uppercase tracking-wide text-brand-900/45">
          {label}
        </div>
        <div
          className={`truncate text-sm font-semibold ${
            value ? "text-brand-950" : "text-brand-900/40"
          }`}
        >
          {value ? fmt(value) : placeholder}
        </div>
      </div>
    </button>
  );

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.round(
      (new Date(checkOut + "T00:00:00").getTime() -
        new Date(checkIn + "T00:00:00").getTime()) /
        86400000
    );
  }, [checkIn, checkOut]);

  return (
    <div ref={ref} className="relative flex flex-[2]">
      {field(t("search.checkIn"), checkIn, false)}
      {field(t("search.checkOut"), checkOut, true)}

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,320px)] rounded-2xl border border-sand-200 bg-white p-4 shadow-2xl ring-1 ring-black/5 sm:w-[560px]">
          {/* Başlık: gezinme + seçili özet */}
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shift(-1)}
              disabled={atCurrentMonth}
              aria-label={lang === "tr" ? "Önceki ay" : "Previous month"}
              className="rounded-full p-2 text-brand-700 transition hover:bg-brand-50 disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-xs font-semibold text-brand-900/60">
              {checkIn && checkOut
                ? `${fmt(checkIn)} → ${fmt(checkOut)} · ${nights} ${
                    lang === "tr" ? "gece" : "nights"
                  }`
                : checkIn
                ? `${fmt(checkIn)} → ${lang === "tr" ? "çıkış seçin" : "select check-out"}`
                : lang === "tr"
                ? "Giriş tarihini seçin"
                : "Select check-in date"}
            </div>
            <button
              type="button"
              onClick={() => shift(1)}
              aria-label={lang === "tr" ? "Sonraki ay" : "Next month"}
              className="rounded-full p-2 text-brand-700 transition hover:bg-brand-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div
            className="flex gap-6"
            onMouseLeave={() => setHovered(null)}
          >
            {renderMonth(0)}
            {renderMonth(1, "hidden sm:block")}
          </div>

          {/* Alt bar: temizle + uygula */}
          <div className="mt-3 flex items-center justify-between border-t border-sand-100 pt-3">
            <button
              type="button"
              onClick={() => onChange("", "")}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              <X className="h-3.5 w-3.5" />
              {lang === "tr" ? "Temizle" : "Clear"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-sun-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-sun-600"
            >
              {lang === "tr" ? "Tamam" : "Done"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
