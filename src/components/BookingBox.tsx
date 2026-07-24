"use client";

import { Star, CalendarCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatPrice, formatDateShort, nightsBetween } from "@/lib/format";
import { rangeHasConflict } from "@/lib/availability";
import GuestSelector, { type GuestCounts } from "./GuestSelector";
import type { Villa } from "@/lib/types";

const CLEANING_FEE = 1500;
const SERVICE_RATE = 0.05;

interface Props {
  villa: Villa;
  checkIn: string | null;
  checkOut: string | null;
  guests: GuestCounts;
  setGuests: (c: GuestCounts) => void;
  onScrollToCalendar: () => void;
}

export default function BookingBox({
  villa,
  checkIn,
  checkOut,
  guests,
  setGuests,
  onScrollToCalendar,
}: Props) {
  const { t, lang } = useI18n();

  const nights =
    checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const conflict =
    checkIn && checkOut
      ? rangeHasConflict(checkIn, checkOut, villa.bookedRanges)
      : false;

  const subtotal = nights * villa.pricePerNight;
  const service = Math.round(subtotal * SERVICE_RATE);
  const total = subtotal + (nights > 0 ? CLEANING_FEE + service : 0);
  const valid = nights >= villa.minNights && !conflict;

  const DateBtn = ({
    label,
    value,
  }: {
    label: string;
    value: string | null;
  }) => (
    <button
      onClick={onScrollToCalendar}
      className="flex-1 rounded-xl border border-sand-200 px-3 py-2.5 text-left transition hover:border-brand-400"
    >
      <div className="text-[11px] font-semibold uppercase text-brand-900/50">
        {label}
      </div>
      <div className="text-sm font-semibold text-brand-950">
        {value ? formatDateShort(value, lang) : t("book.selectDates")}
      </div>
    </button>
  );

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <span className="text-2xl font-extrabold text-brand-800">
            {formatPrice(villa.pricePerNight, lang)}
          </span>
          <span className="ml-1 text-sm text-brand-900/60">
            / {t("card.perNight")}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-900">
          <Star className="h-4 w-4 fill-sun-400 text-sun-400" />
          {villa.rating.toFixed(1)}
          <span className="font-normal text-brand-900/50">
            ({villa.reviewCount})
          </span>
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <DateBtn label={t("book.checkIn")} value={checkIn} />
        <DateBtn label={t("book.checkOut")} value={checkOut} />
      </div>

      {/* Guests */}
      <div className="mt-2 rounded-xl border border-sand-200">
        <GuestSelector
          value={guests}
          onChange={setGuests}
          label={t("book.guests")}
          max={villa.capacity}
        />
      </div>

      {/* Price breakdown */}
      {nights > 0 && !conflict && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-brand-900/70">
            <span>
              {formatPrice(villa.pricePerNight, lang)} × {nights}{" "}
              {t("book.nightsTotal")}
            </span>
            <span>{formatPrice(subtotal, lang)}</span>
          </div>
          <div className="flex justify-between text-brand-900/70">
            <span>{t("book.cleaning")}</span>
            <span>{formatPrice(CLEANING_FEE, lang)}</span>
          </div>
          <div className="flex justify-between text-brand-900/70">
            <span>{t("book.serviceFee")}</span>
            <span>{formatPrice(service, lang)}</span>
          </div>
          <div className="flex justify-between border-t border-sand-200 pt-2 text-base font-extrabold text-brand-950">
            <span>{t("book.total")}</span>
            <span>{formatPrice(total, lang)}</span>
          </div>
        </div>
      )}

      {conflict && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
          {t("book.unavailable")}
        </p>
      )}
      {nights > 0 && nights < villa.minNights && !conflict && (
        <p className="mt-3 rounded-lg bg-sun-50 px-3 py-2 text-sm font-medium text-sun-700">
          {t("detail.minNights")}: {villa.minNights} {t("detail.nights")}
        </p>
      )}

      <button
        disabled={!valid}
        onClick={() => alert(t("book.request"))}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sun-500 py-3 font-bold text-white shadow-sm transition hover:bg-sun-600 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-brand-900/40"
      >
        <CalendarCheck className="h-5 w-5" />
        {t("book.reserve")}
      </button>
      <p className="mt-2 text-center text-xs text-brand-900/50">
        {t("book.noCharge")}
      </p>
    </div>
  );
}
