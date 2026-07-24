"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Heart,
  MapPin,
  Users,
  BedDouble,
  Bath,
  ArrowRight,
  Zap,
} from "lucide-react";
import type { Villa } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { villaCode, priceRange } from "@/lib/villas";

export default function VillaCard({ villa }: { villa: Villa }) {
  const { t, lang } = useI18n();
  const [fav, setFav] = useState(false);

  const code = villaCode(villa.slug);
  const { min, max } = priceRange(villa);
  const hasDiscount = !!villa.discountPercent;
  const factor = hasDiscount ? 1 - villa.discountPercent! / 100 : 1;
  const dMin = Math.round(min * factor);
  const dMax = Math.round(max * factor);
  const discountLabel =
    lang === "tr" ? `%${villa.discountPercent}` : `${villa.discountPercent}%`;

  return (
    <Link
      href={`/villa/${villa.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border bg-white transition duration-300 ${
        hasDiscount
          ? "border-rose-200 ring-1 ring-rose-200 hover:border-rose-300"
          : "border-sand-200 hover:border-brand-300"
      }`}
    >
      {/* Görsel */}
      <div className="relative aspect-[16/10] overflow-hidden">
        <Image
          src={villa.images[0]}
          alt={code}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-110"
        />

        {/* Flaş indirim etiketi */}
        {hasDiscount && (
          <div className="absolute left-0 top-3 z-10">
            <div className="flash-shine rounded-r-full bg-gradient-to-r from-rose-600 to-red-500 py-1.5 pl-3 pr-4 shadow-lg">
              <span className="relative flex items-center gap-1 text-xs font-extrabold uppercase tracking-wide text-white">
                <Zap className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
                {t("card.flashDeal")} · {discountLabel}
              </span>
            </div>
          </div>
        )}

        {villa.featured && !hasDiscount && (
          <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-sun-500 px-2.5 py-1 text-xs font-bold text-white shadow">
            ★ {lang === "tr" ? "Öne Çıkan" : "Featured"}
          </span>
        )}

        {/* Favori */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setFav((v) => !v);
          }}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/25 p-2 backdrop-blur transition hover:bg-white/40"
          aria-label="Favorite"
        >
          <Heart
            className={`h-5 w-5 ${
              fav ? "fill-rose-500 text-rose-500" : "text-white"
            }`}
          />
        </button>
      </div>

      {/* Gövde */}
      <div className="flex flex-1 flex-col p-4">
        {/* Kod + konum */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xl font-extrabold leading-none tracking-tight text-brand-950">
              {code}
            </div>
            <div className="mt-1 text-xs text-brand-900/45">
              {t("card.facilityCode")}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-1 font-bold text-brand-900">
              <MapPin className="h-4 w-4 text-sun-500" />
              {villa.region}
            </div>
            <div className="mt-0.5 text-xs text-brand-900/45">
              Türkiye / {villa.province}
            </div>
          </div>
        </div>

        {/* Özellikler — kutular */}
        <div className="my-3 flex gap-2">
          {[
            { icon: Users, value: villa.capacity, label: t("card.person") },
            { icon: BedDouble, value: villa.bedrooms, label: t("card.bedroom") },
            { icon: Bath, value: villa.bathrooms, label: t("card.bath") },
          ].map((f, i) => (
            <div
              key={i}
              className="flex flex-1 flex-col items-center gap-0.5 rounded-xl border border-sand-200 bg-sand-50 px-1 py-2.5 text-center transition group-hover:border-brand-200 group-hover:bg-brand-50/50"
            >
              <f.icon className="mb-0.5 h-4 w-4 text-brand-500" />
              <span className="text-sm font-extrabold leading-none text-brand-900">
                {f.value}
              </span>
              <span className="text-[10px] leading-tight text-brand-900/55">
                {f.label}
              </span>
            </div>
          ))}
        </div>

        {/* Fiyat paneli */}
        <div
          className={`mt-auto flex items-end justify-between gap-2 rounded-xl px-3 py-2.5 ring-1 ${
            hasDiscount
              ? "bg-rose-50 ring-rose-100"
              : "bg-sand-50 ring-sand-200"
          }`}
        >
          <div className="min-w-0">
            {hasDiscount && (
              <div className="mb-1 flex items-center gap-1.5">
                <span className="text-xs font-medium text-brand-900/40 line-through">
                  {formatPrice(min, lang)} - {formatPrice(max, lang)}
                </span>
                <span className="rounded bg-rose-600 px-1.5 py-px text-[10px] font-extrabold text-white">
                  -{discountLabel}
                </span>
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span
                className={`whitespace-nowrap text-lg font-black leading-none ${
                  hasDiscount ? "text-rose-600" : "text-brand-800"
                }`}
              >
                {formatPrice(dMin, lang)} - {formatPrice(dMax, lang)}
              </span>
            </div>
            <div className="mt-1 text-[11px] font-semibold text-sun-600">
              /{t("card.perNightShort")}
              <span className="ml-1 font-normal text-brand-900/45">
                · {t("card.priceRange")}
              </span>
            </div>
          </div>

          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white transition group-hover:scale-105 ${
              hasDiscount
                ? "bg-rose-600 group-hover:bg-rose-700"
                : "bg-sun-500 group-hover:bg-sun-600"
            }`}
          >
            <ArrowRight className="h-5 w-5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
