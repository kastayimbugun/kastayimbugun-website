"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { formatPrice, formatDateShort, businessToday } from "@/lib/format";
import { displayPriceRange } from "@/lib/villaUtils";
import TurnstileWidget from "@/components/TurnstileWidget";
import { rangeHasConflict } from "@/lib/availability";
import { calcPrice } from "@/lib/pricing";
import { createBookingRequest } from "@/lib/actions/booking";
import GuestSelector, { type GuestCounts } from "./GuestSelector";
import type { Villa } from "@/lib/types";

function DateBtn({
  label,
  value,
  placeholder,
  lang,
  onClick,
}: {
  label: string;
  value: string | null;
  placeholder: string;
  lang: "tr" | "en";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-1 rounded-xl border border-sand-200 px-3 py-2.5 text-left transition hover:border-brand-400"
    >
      <div className="text-[11px] font-semibold uppercase text-brand-900/50">
        {label}
      </div>
      <div className="text-sm font-semibold text-brand-950">
        {value ? formatDateShort(value, lang) : placeholder}
      </div>
    </button>
  );
}

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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [showForm, setShowForm] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  const conflict =
    checkIn && checkOut
      ? rangeHasConflict(checkIn, checkOut, villa.bookedRanges)
      : false;

  // Fiyat, sunucudaki calcPrice ile AYNI fonksiyondan gelir (tek doğruluk kaynağı).
  // Buradaki tutar yalnızca gösterim; nihai tutarı sunucu yeniden hesaplar.
  const price =
    checkIn && checkOut && !conflict
      ? calcPrice(villa, checkIn, checkOut, {
          guests: guests.adults + guests.children,
          // Son dakika indirimi için "bugün". Europe/Istanbul'a sabit:
          // tarayıcının saat dilimi ne olursa olsun sunucuyla aynı günü söyler,
          // yoksa gece yarısı–03:00 arası gösterilen ve kaydedilen tutar ayrışır.
          asOf: businessToday(),
        })
      : null;

  // Tarih seçilmemişken gösterilecek fiyat: kartla aynı kaynak (sezon minimumu,
  // flaş indirim uygulanmış). İndirim çarpanı eskiden yalnızca kartta vardı;
  // kart ₺4.400, buradaki başlık ₺5.500 yazıyordu.
  const headlineFrom = displayPriceRange(villa).min;

  const nights = price?.nights ?? 0;
  const valid = nights >= villa.minNights && !conflict;

  const submit = () => {
    setError(null);
    if (!checkIn || !checkOut) {
      setError(t("form.selectDatesFirst"));
      return;
    }
    startTransition(async () => {
      const res = await createBookingRequest({
        villaSlug: villa.slug,
        checkIn,
        checkOut,
        adults: guests.adults,
        children: guests.children,
        babies: guests.babies,
        fullName,
        phone,
        email,
        note,
        lang,
        // Sunucu üretimde token YOKSA reddeder. Bu alan eklenmeden
        // TURNSTILE_SECRET_KEY tanımlanırsa tüm gerçek talepler kaybedilir.
        turnstileToken,
      });
      if (res.ok) {
        router.push("/rezervasyon-talebi/tesekkurler");
      } else {
        setError(
          res.error === "dates"
            ? t("form.errorDates")
            : res.error === "validation"
              ? t("form.errorValidation")
              : res.error === "captcha"
                ? t("form.errorCaptcha")
                : res.error === "rate_limit"
                  ? t("form.errorRateLimit")
                  : t("form.errorGeneric")
        );
      }
    });
  };

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-5">
      {/*
        Başlık fiyatı, kart ve seçili tarihle TUTARLI olmalı.

        Eskiden burada her zaman `villa.pricePerNight` (taban fiyat) yazıyordu.
        Kart sezonların min–max aralığını gösterdiği için kullanıcı kartta
        "₺5.500 – ₺12.750", detayda "₺5.500", dökümde ise "₺9.000 × 5 gece"
        görüyordu — üç yerde üç farklı sayı, "fiyat oyunu oynuyorlar" hissi.

        Artık: tarih seçiliyse O ARALIĞIN gecelik ortalaması, seçili değilse
        "en düşük sezon fiyatından itibaren" (kartla aynı dil).
      */}
      <div className="flex items-baseline">
        <span className="text-2xl font-extrabold text-brand-800">
          {formatPrice(price ? price.nightlyAvg : headlineFrom, lang)}
        </span>
        <span className="ml-1 text-sm text-brand-900/60">
          / {t("card.perNight")}
        </span>
        {!price && (
          <span className="ml-2 text-xs text-brand-900/70">
            {t("book.fromPrice")}
          </span>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        <DateBtn
          label={t("book.checkIn")}
          value={checkIn}
          placeholder={t("book.selectDates")}
          lang={lang}
          onClick={onScrollToCalendar}
        />
        <DateBtn
          label={t("book.checkOut")}
          value={checkOut}
          placeholder={t("book.selectDates")}
          lang={lang}
          onClick={onScrollToCalendar}
        />
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
      {price && nights > 0 && (
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-brand-900/70">
            <span>
              {formatPrice(price.nightlyAvg, lang)} × {nights}{" "}
              {t("book.nightsTotal")}
            </span>
            <span>{formatPrice(price.subtotal, lang)}</span>
          </div>
          {/*
            Flaş indirim gecelik fiyata GÖMÜLÜ (kart ve takvimde ilan edilen
            rakam o). Burada ayrıca yazılıyor ki müşteri ne kazandığını görsün.
          */}
          {price.flashDiscount > 0 && (
            <div className="flex justify-between text-rose-600">
              <span className="font-semibold">
                %{price.flashPercent} {t("book.flashDiscount")}
              </span>
              <span className="text-brand-900/40 line-through">
                {formatPrice(price.grossSubtotal, lang)}
              </span>
            </div>
          )}
          {price.discount > 0 && (
            <div className="flex justify-between font-semibold text-emerald-700">
              <span>{price.discountLabel}</span>
              <span>−{formatPrice(price.discount, lang)}</span>
            </div>
          )}
          {price.extraGuestFee > 0 && (
            <div className="flex justify-between text-brand-900/70">
              <span>{lang === "tr" ? "Ek kişi ücreti" : "Extra guest fee"}</span>
              <span>{formatPrice(price.extraGuestFee, lang)}</span>
            </div>
          )}
          {price.cleaningFee > 0 && (
            <div className="flex justify-between text-brand-900/70">
              <span>{t("book.cleaning")}</span>
              <span>{formatPrice(price.cleaningFee, lang)}</span>
            </div>
          )}
          <div className="flex justify-between text-brand-900/70">
            <span>{t("book.serviceFee")}</span>
            <span>{formatPrice(price.serviceFee, lang)}</span>
          </div>
          <div className="flex justify-between border-t border-sand-200 pt-2 text-base font-extrabold text-brand-950">
            <span>{t("book.total")}</span>
            <span>{formatPrice(price.total, lang)}</span>
          </div>
          <p className="text-xs text-brand-900/45">{t("book.priceNote")}</p>
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

      {/* İletişim formu — yalnızca talep başlatılınca açılır */}
      {showForm && (
        <div className="mt-4 space-y-3 border-t border-sand-200 pt-4">
          <h3 className="text-sm font-bold text-brand-950">
            {t("form.title")}
          </h3>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("form.fullNamePh")}
            aria-label={t("form.fullName")}
            className="w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("form.phonePh")}
            aria-label={t("form.phone")}
            className="w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("form.emailPh")}
            aria-label={t("form.email")}
            className="w-full rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("form.notePh")}
            aria-label={t("form.note")}
            rows={2}
            className="w-full resize-none rounded-xl border border-sand-200 bg-sand-50 px-3 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-600">
          {error}
        </p>
      )}

      {/* Ana eylem butonu */}
      {!showForm ? (
        <button
          disabled={!valid}
          onClick={() => {
            setError(null);
            setShowForm(true);
          }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sun-500 py-3 font-bold text-white shadow-sm transition hover:bg-sun-600 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-brand-900/40"
        >
          <CalendarCheck className="h-5 w-5" />
          {t("book.reserve")}
        </button>
      ) : (
        <>
          {/* Site anahtarı tanımlı değilse hiçbir şey render etmez. */}
          <TurnstileWidget onToken={setTurnstileToken} lang={lang} />
          <div className="mt-4 flex gap-2">
          <button
            onClick={() => setShowForm(false)}
            disabled={pending}
            className="rounded-xl border border-sand-200 px-4 py-3 text-sm font-semibold text-brand-800 transition hover:bg-sand-50 disabled:opacity-50"
          >
            {t("form.cancel")}
          </button>
          <button
            onClick={submit}
            disabled={pending || !fullName.trim() || phone.trim().length < 7}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sun-500 py-3 font-bold text-white shadow-sm transition hover:bg-sun-600 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-brand-900/40"
          >
            {pending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CalendarCheck className="h-5 w-5" />
            )}
            {pending ? t("form.submitting") : t("form.submit")}
          </button>
          </div>
        </>
      )}

      <p className="mt-2 text-center text-xs text-brand-900/50">
        {t("book.noCharge")}
      </p>
    </div>
  );
}
