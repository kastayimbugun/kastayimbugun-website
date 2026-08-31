"use client";

import { useRef, useState } from "react";
import {
  Star,
  MapPin,
  Users,
  BedDouble,
  Bath,
  Ruler,
  Waves,
  Droplets,
  Clock,
  Moon,
  ChevronDown,
  Wallet,
  BadgeCheck,
} from "lucide-react";
import Gallery from "./Gallery";
import AvailabilityCalendar from "./AvailabilityCalendar";
import BookingBox from "./BookingBox";
import { type GuestCounts } from "./GuestSelector";
import VillaCard from "./VillaCard";
import { useI18n } from "@/lib/i18n";
import { formatPrice, formatDate, businessToday } from "@/lib/format";
import { calcPrice } from "@/lib/pricing";
import { displayPriceRange } from "@/lib/villaUtils";
import MobileBookingBar from "./MobileBookingBar";
import { rangeHasConflict } from "@/lib/availability";
import { amenityIcons } from "@/lib/amenityIcons";
import { villaDistances } from "@/lib/distances";
import type { Villa } from "@/lib/types";
import {
  DEFAULT_VILLA_DETAIL_PREFS,
  type VillaDetailPrefs,
} from "@/lib/villaDetailPrefs";

export default function VillaDetailClient({
  villa,
  otherVillas = [],
  prefs = DEFAULT_VILLA_DETAIL_PREFS,
  categoryVillas,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
  whatsapp,
}: {
  villa: Villa;
  /** Benzer villalar bölümü için — sunucudan gelir */
  otherVillas?: Villa[];
  /** Site geneli görünürlük tercihleri */
  prefs?: VillaDetailPrefs;
  /** "Benzer Villalar" kategori modundaysa önceden çözülmüş villalar */
  categoryVillas?: Villa[];
  /**
   * Aramadan gelen bağlam (sunucuda URL'den çözülür).
   *
   * Bunlar olmadan kullanıcı tarihi iki kez giriyordu: bir kez arama
   * çubuğunda, bir kez de burada. Artık kart tıklandığında tarih ve kişi
   * sayısı hazır gelir; fiyat da doğrudan hesaplanmış görünür.
   */
  initialCheckIn?: string | null;
  initialCheckOut?: string | null;
  initialGuests?: number | null;
  /** Panelden girilen WhatsApp numarası — mobil çubuktaki hızlı iletişim. */
  whatsapp?: string | null;
}) {
  const { t, lang, amenity } = useI18n();

  // Gelen aralık bu villada gerçekten müsait mi? Değilse boş başla —
  // dolu bir aralığı seçili göstermek yanlış bilgi verir.
  const contextRangeUsable =
    !!initialCheckIn &&
    !!initialCheckOut &&
    initialCheckOut > initialCheckIn &&
    !rangeHasConflict(initialCheckIn, initialCheckOut, villa.bookedRanges);

  const [checkIn, setCheckIn] = useState<string | null>(
    contextRangeUsable ? initialCheckIn! : null
  );
  const [checkOut, setCheckOut] = useState<string | null>(
    contextRangeUsable ? initialCheckOut! : null
  );
  const [guests, setGuests] = useState<GuestCounts>({
    adults: Math.min(initialGuests && initialGuests > 0 ? initialGuests : 2, villa.capacity),
    children: 0,
    babies: 0,
  });
  const [showAllDist, setShowAllDist] = useState(false);
  const calendarRef = useRef<HTMLDivElement>(null);
  const bookingRef = useRef<HTMLDivElement>(null);

  // Mobil çubuk, rezervasyon kutusuyla AYNI fiyat kaynağını kullanır — iki
  // yerde farklı sayı göstermek denetimdeki UX-03'ün ta kendisiydi.
  const barConflict =
    checkIn && checkOut
      ? rangeHasConflict(checkIn, checkOut, villa.bookedRanges)
      : false;
  const barPrice =
    checkIn && checkOut && !barConflict
      ? calcPrice(villa, checkIn, checkOut, {
          guests: guests.adults + guests.children,
          asOf: businessToday(),
        })
      : null;

  /** Tarih yoksa takvime, varsa rezervasyon kutusuna götürür. */
  const goToBooking = () => {
    const target = barPrice ? bookingRef.current : calendarRef.current;
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const onDayClick = (iso: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }
    if (iso <= checkIn) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }
    if (rangeHasConflict(checkIn, iso, villa.bookedRanges)) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }
    setCheckOut(iso);
  };

  const scrollToCalendar = () =>
    calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });

  const description = lang === "tr" ? villa.descriptionTr : villa.descriptionEn;

  // "Benzer Villalar" kaynağı: kategori modunda önceden çözülmüş liste, aksi halde
  // önce aynı bölgedekiler sonra diğerleri. "off" modunda bölüm hiç gösterilmez.
  const similarSource =
    prefs.similar.mode === "category"
      ? (categoryVillas ?? [])
      : otherVillas
          .filter((v) => v.slug !== villa.slug && v.region === villa.region)
          .concat(
            otherVillas.filter(
              (v) => v.slug !== villa.slug && v.region !== villa.region
            )
          );
  const similar = similarSource.filter((v) => v.slug !== villa.slug).slice(0, 3);

  // Bir kutu gösterilir: admin kapatmamış (prefs) VE veri girilmiş (0 değil).
  const facts = [
    prefs.facts.capacity && villa.capacity > 0 && {
      icon: Users,
      label: t("card.guests"),
      value: `${villa.capacity} ${t("card.person")}`,
    },
    prefs.facts.bedrooms && villa.bedrooms > 0 && {
      icon: BedDouble,
      label: t("card.bedroom"),
      value: `${villa.bedrooms} ${t("card.bedrooms")}`,
    },
    prefs.facts.bathrooms && villa.bathrooms > 0 && {
      icon: Bath,
      label: t("card.bath"),
      value: `${villa.bathrooms} ${t("card.bath")}`,
    },
    prefs.facts.size && villa.size > 0 && {
      icon: Ruler,
      label: t("detail.area"),
      value: `${villa.size} m²`,
    },
    prefs.facts.distanceToSea && villa.distanceToSea > 0 && {
      icon: Waves,
      label: t("card.toSea"),
      value: `${villa.distanceToSea} m`,
    },
    prefs.facts.pool && villa.pool !== "none" && {
      icon: Droplets,
      label: lang === "tr" ? "Havuz" : "Pool",
      value:
        villa.pool === "private"
          ? lang === "tr"
            ? "Özel"
            : "Private"
          : lang === "tr"
          ? "Ortak"
          : "Shared",
    },
    prefs.facts.rating && villa.rating > 0 && {
      icon: Star,
      label: lang === "tr" ? "Puan" : "Rating",
      value: villa.rating.toFixed(1),
    },
    prefs.facts.minNights && villa.minNights > 0 && {
      icon: Moon,
      label: lang === "tr" ? "Min. Konaklama" : "Min. Stay",
      value: `${villa.minNights} ${t("detail.nights")}`,
    },
    prefs.facts.checkInOut && villa.checkIn && villa.checkOut && {
      icon: Clock,
      label: lang === "tr" ? "Giriş / Çıkış" : "Check-in / out",
      value: `${villa.checkIn} / ${villa.checkOut}`,
    },
  ].filter(Boolean) as {
    icon: typeof Users;
    label: string;
    value: string;
  }[];

  const dists = villaDistances(villa, lang);
  const visibleDists = showAllDist ? dists : dists.slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <Gallery images={villa.images} name={villa.name} />

      {/* Title */}
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <h1 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">
          {villa.name}
        </h1>
        <div className="flex flex-col gap-1 text-sm text-brand-900/70 sm:items-end">
          <span className="inline-flex items-center gap-1 font-semibold text-brand-900">
            <Star className="h-4 w-4 fill-sun-400 text-sun-400" />
            {villa.rating.toFixed(1)}
            <span className="font-normal text-brand-900/50">
              · {villa.reviewCount} {t("detail.reviews")}
            </span>
          </span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-4 w-4 text-brand-500" />
            {villa.region}, {villa.province}
          </span>
        </div>
      </div>

      {/* Facts — dinamik: kutu sayısına göre satırlar tam genişliği kaplar.
          flex-wrap + flex-1/basis: her satırdaki kutular eşit büyür (5 → 3+2,
          6 → 3+3, taşan alt satıra iner ve yine satırı doldurur). */}
      <div className="mt-6 flex flex-wrap gap-3">
        {facts.map((f) => (
          <div
            key={f.label}
            className="flex-1 basis-[45%] rounded-xl border border-sand-200 bg-sand-50 p-4 text-center sm:basis-[150px]"
          >
            <f.icon className="mx-auto h-6 w-6 text-brand-500" />
            <div className="mt-2 text-xs font-medium text-brand-900/55">
              {f.label}
            </div>
            <div className="mt-0.5 text-sm font-extrabold text-brand-950">
              {f.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        {/* LEFT */}
        <div className="min-w-0 flex-1 space-y-10">

          {/* Overview */}
          {prefs.sections.overview && (
          <section>
            <h2 className="text-xl font-bold text-brand-950">
              {t("detail.overview")}
            </h2>
            {description && (
              <p className="mt-3 leading-relaxed text-brand-900/75">
                {description}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              {villa.checkIn && villa.checkOut && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 font-medium text-brand-800">
                  <Clock className="h-4 w-4" />
                  {t("detail.checkInOut")}: {villa.checkIn} / {villa.checkOut}
                </span>
              )}
              {villa.minNights > 0 && (
                <span className="inline-flex items-center gap-2 rounded-lg bg-brand-50 px-3 py-2 font-medium text-brand-800">
                  <Moon className="h-4 w-4" />
                  {t("detail.minNights")}: {villa.minNights} {t("detail.nights")}
                </span>
              )}
            </div>
          </section>
          )}

          {/* Amenities */}
          {prefs.sections.amenities && villa.amenities.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-brand-950">
              {t("detail.amenities")}
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {villa.amenities.map((a) => {
                const Icon = amenityIcons[a];
                return (
                  <div
                    key={a}
                    className="flex items-center gap-3 rounded-xl border border-sand-200 px-3 py-2.5"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-brand-600" />
                    <span className="text-sm font-medium text-brand-900">
                      {amenity(a)}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
          )}

          {/* Havuz Bilgileri */}
          {prefs.sections.poolInfo &&
            (villa.poolWidth || villa.poolLength || villa.poolDepth) && (
            <section>
              <h2 className="text-xl font-bold text-brand-950">
                {lang === "tr" ? "Havuz Bilgileri" : "Pool Information"}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {villa.pool !== "none" && (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-sand-200 bg-white px-4 py-2.5 text-sm font-semibold text-brand-900">
                    <Waves className="h-5 w-5 text-brand-600" />
                    {villa.pool === "private"
                      ? lang === "tr"
                        ? "Özel Havuz"
                        : "Private Pool"
                      : lang === "tr"
                      ? "Ortak Havuz"
                      : "Shared Pool"}
                  </span>
                )}
                {[
                  { v: villa.poolWidth, tr: "En", en: "Width" },
                  { v: villa.poolLength, tr: "Boy", en: "Length" },
                  { v: villa.poolDepth, tr: "Derinlik", en: "Depth" },
                ].map((d, i) =>
                  d.v ? (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sand-200 px-4 py-2.5 text-sm"
                    >
                      <span className="text-brand-900/55">
                        {lang === "tr" ? d.tr : d.en}:
                      </span>
                      <span className="font-bold text-brand-900">{d.v} m</span>
                    </span>
                  ) : null
                )}
              </div>
            </section>
          )}

          {/* Hasar Depozitosu */}
          {prefs.sections.deposit &&
            villa.damageDeposit != null &&
            villa.damageDeposit > 0 && (
            <section>
              <h2 className="text-xl font-bold text-brand-950">
                {lang === "tr" ? "Hasar Depozitosu" : "Damage Deposit"}
              </h2>
              <div className="mt-4 flex flex-col gap-4 rounded-2xl border border-sand-200 bg-white p-5 sm:flex-row sm:items-center">
                <div className="flex shrink-0 items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Wallet className="h-5 w-5" />
                  </span>
                  <span className="text-2xl font-extrabold text-brand-900">
                    {formatPrice(villa.damageDeposit, lang)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-brand-900/70">
                  {lang === "tr"
                    ? "Hasar, kayıp, kırık-dökük vb. durumlar için girişte alınır; herhangi bir sorun olmadığı takdirde villa çıkışında iade edilir."
                    : "Collected at check-in for damage, loss or breakage; refunded at check-out if there are no issues."}
                </p>
              </div>
            </section>
          )}

          {/* Availability */}
          {prefs.sections.availability && (
          <section ref={calendarRef} className="scroll-mt-32">
            <h2 className="text-xl font-bold text-brand-950">
              {t("detail.availability")}
            </h2>
            <div className="mt-4 rounded-2xl border border-sand-200 bg-white p-5">
              <AvailabilityCalendar
                bookedRanges={villa.bookedRanges}
                checkIn={checkIn}
                checkOut={checkOut}
                onDayClick={onDayClick}
                seasons={villa.seasons}
                discountPercent={villa.discountPercent}
                weekendPremiumPercent={villa.weekendPremiumPercent}
              />
            </div>
          </section>
          )}

          {/* Price table */}
          {prefs.sections.priceTable && villa.seasons.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-brand-950">
              {t("detail.priceTable")}
            </h2>
            <div className="mt-4 overflow-hidden rounded-2xl border border-sand-200">
              <table className="w-full text-sm">
                <thead className="bg-brand-800 text-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("detail.season")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold">
                      {t("detail.dates")}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      {t("detail.nightly")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {villa.seasons.map((s, i) => (
                    <tr
                      key={i}
                      className={i % 2 ? "bg-sand-50" : "bg-white"}
                    >
                      <td className="px-4 py-3 font-semibold text-brand-900">
                        {lang === "tr" ? s.labelTr : s.labelEn}
                      </td>
                      <td className="px-4 py-3 text-brand-900/70">
                        {formatDate(s.start, lang)} — {formatDate(s.end, lang)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-brand-800">
                        {formatPrice(s.price, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          )}

          {/* Uzaklıklar */}
          {prefs.sections.distances && dists.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-brand-950">
              {t("detail.distances")}
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleDists.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-xl bg-sun-500 px-4 py-3 text-white"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/20">
                    <d.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-bold leading-tight">
                      {d.label}
                      {d.detail && (
                        <span className="ml-1 text-xs font-normal text-white/80">
                          ({d.detail})
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-white/95">
                      {d.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {dists.length > 6 && (
              <button
                onClick={() => setShowAllDist((v) => !v)}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-sun-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-sun-600"
              >
                {showAllDist ? t("cat.showLess") : t("cat.showMore")}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showAllDist ? "rotate-180" : ""
                  }`}
                />
              </button>
            )}
          </section>
          )}

          {/* Video */}
          {prefs.sections.video && villa.videoUrl && (
            <section>
              <h2 className="text-xl font-bold text-brand-950">
                {t("detail.video")}
              </h2>
              <div className="mt-4 aspect-video overflow-hidden rounded-2xl bg-brand-950">
                <iframe
                  src={villa.videoUrl}
                  title={`${villa.name} video`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </section>
          )}

          {/* Location */}
          {prefs.sections.location && (
          <section>
            <h2 className="text-xl font-bold text-brand-950">
              {t("detail.location")}
            </h2>
            <div className="relative mt-4 flex h-56 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-100 to-brand-50 ring-1 ring-sand-200">
              <div
                className="absolute inset-0 opacity-40"
                style={{
                  backgroundImage:
                    "linear-gradient(#f0d5a6 1px, transparent 1px), linear-gradient(90deg, #f0d5a6 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />
              <div className="relative text-center">
                <MapPin className="mx-auto h-10 w-10 text-sun-500" />
                <div className="mt-2 font-bold text-brand-900">
                  {villa.region}, {villa.province}
                </div>
                {villa.distanceToSea > 0 && (
                  <div className="text-sm text-brand-900/60">
                    {t("card.toSea")}: {villa.distanceToSea} m
                  </div>
                )}
              </div>
            </div>
          </section>
          )}
        </div>

        {/* RIGHT — sticky booking */}
        <div ref={bookingRef} className="w-full scroll-mt-24 lg:w-[360px] lg:shrink-0">
          <div className="lg:sticky lg:top-32">
            <BookingBox
              villa={villa}
              checkIn={checkIn}
              checkOut={checkOut}
              guests={guests}
              setGuests={setGuests}
              onScrollToCalendar={scrollToCalendar}
            />

            {/* Bakanlık işletme belgesi — villaya özel, girildiyse gösterilir */}
            {villa.ministryCertNo && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#e30613] p-3 text-white shadow-sm">
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/bakanlik-amblem.svg"
                    alt="T.C. Kültür ve Turizm Bakanlığı"
                    className="h-11 w-11 shrink-0"
                  />
                  <span className="text-xs font-bold uppercase leading-tight tracking-wide">
                    {lang === "tr" ? (
                      <>
                        T.C. Kültür ve
                        <br />
                        Turizm Bakanlığı
                      </>
                    ) : (
                      <>
                        Ministry of Culture
                        <br />& Tourism
                      </>
                    )}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-xl bg-white px-3 py-2">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-[#e30613]" />
                  <div className="leading-tight">
                    <div className="text-[10px] font-medium text-brand-900/55">
                      {lang === "tr" ? "Belge No" : "Certificate No"}
                    </div>
                    <div className="text-sm font-extrabold text-brand-950">
                      {villa.ministryCertNo}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Similar — "off" modunda ya da uygun villa yoksa hiç gösterilmez */}
      {prefs.similar.mode !== "off" && similar.length > 0 && (
        <section className="mt-16">
          <h2 className="text-2xl font-extrabold text-brand-950">
            {t("detail.similar")}
          </h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((v) => (
              <VillaCard key={v.slug} villa={v} />
            ))}
          </div>
        </section>
      )}

      <MobileBookingBar
        villaName={villa.name}
        villaCode={villa.code}
        priceLabel={formatPrice(
          barPrice ? barPrice.nightlyAvg : displayPriceRange(villa).min,
          lang
        )}
        totalLabel={barPrice ? formatPrice(barPrice.total, lang) : null}
        nights={barPrice?.nights ?? 0}
        hasDates={!!barPrice}
        whatsapp={whatsapp}
        bookingBoxRef={bookingRef}
        onPrimary={goToBooking}
      />

      {/* Yapışkan çubuk son bölümü örtmesin */}
      <div aria-hidden="true" className="h-20 lg:hidden" />
    </div>
  );
}
