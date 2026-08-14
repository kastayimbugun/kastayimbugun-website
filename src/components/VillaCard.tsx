"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Heart,
  MapPin,
  Users,
  BedDouble,
  Bath,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
} from "lucide-react";
import type { Villa } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import { formatPrice } from "@/lib/format";
import { villaCode, priceRange } from "@/lib/villaUtils";

/** Kartta gösterilecek görsel sayısı — vitrin için ilk birkaçı yeter. */
const CARD_IMAGES = 5;

export default function VillaCard({ villa }: { villa: Villa }) {
  const { t, lang } = useI18n();
  const [fav, setFav] = useState(false);

  // Kart görseli artık mini galeri: ok + noktalarla ilk birkaç fotoğraf
  // gezilebilir. Villa detayına gitmeden (kart bir Link) çalışması için
  // ok/nokta tıklamaları preventDefault + stopPropagation yapar.
  const gallery = villa.images.slice(0, CARD_IMAGES);
  const [idx, setIdx] = useState(0);
  const go = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    setIdx((i) => Math.min(gallery.length - 1, Math.max(0, i + dir)));
  };

  // Mobil dokunmatik kaydırma: görseller yatay bir şeritte; parmakla sürüklenir,
  // bırakınca eşiği aşan yön bir sonraki/önceki fotoğrafa geçer. Dikey hareket
  // sayfayı normal kaydırır (yön belirlenene kadar müdahale edilmez).
  const galleryRef = useRef<HTMLDivElement>(null);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Handler'lar yeniden abone olmasın diye anlık değerler ref'te tutulur.
  const idxRef = useRef(idx);
  useEffect(() => {
    idxRef.current = idx;
  }, [idx]);
  const dragPxRef = useRef(0);
  const swipedRef = useRef(false);

  useEffect(() => {
    const el = galleryRef.current;
    if (!el || gallery.length <= 1) return;

    let startX = 0;
    let startY = 0;
    let dir: "h" | "v" | null = null;

    const onStart = (e: TouchEvent) => {
      const tch = e.touches[0];
      startX = tch.clientX;
      startY = tch.clientY;
      dir = null;
      setDragging(true);
    };
    const onMove = (e: TouchEvent) => {
      const tch = e.touches[0];
      const dx = tch.clientX - startX;
      const dy = tch.clientY - startY;
      if (dir === null) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        dir = Math.abs(dx) > Math.abs(dy) ? "h" : "v";
      }
      if (dir !== "h") return;
      e.preventDefault(); // yatay sürüklemede sayfanın kaymasını engelle
      const i = idxRef.current;
      const atEdge = (i === 0 && dx > 0) || (i === gallery.length - 1 && dx < 0);
      const d = atEdge ? dx * 0.35 : dx; // kenarlarda direnç
      dragPxRef.current = d;
      setDragPx(d);
    };
    const onEnd = () => {
      const width = el.clientWidth || 1;
      const d = dragPxRef.current;
      swipedRef.current = dir === "h" && Math.abs(d) > 6;
      if (dir === "h") {
        const threshold = Math.min(width * 0.18, 80);
        const i = idxRef.current;
        if (d <= -threshold && i < gallery.length - 1) setIdx(i + 1);
        else if (d >= threshold && i > 0) setIdx(i - 1);
      }
      dragPxRef.current = 0;
      setDragPx(0);
      setDragging(false);
      dir = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [gallery.length]);

  const code = villa.code ?? villaCode(villa.slug);
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
      {/* Görsel — mini galeri (mobilde parmakla kaydırılır) */}
      <div
        ref={galleryRef}
        className="relative aspect-[16/10] overflow-hidden"
        style={{ touchAction: "pan-y" }}
        onClickCapture={(e) => {
          // Yatay kaydırmadan sonra villaya girmeyi engelle.
          if (swipedRef.current) {
            e.preventDefault();
            e.stopPropagation();
            swipedRef.current = false;
          }
        }}
      >
        {/* Yatay şerit — her fotoğraf yan yana; idx + sürükleme kadar kaydırılır */}
        <div
          className="flex h-full w-full"
          style={{
            transform: `translate3d(calc(${-idx * 100}% + ${dragPx}px), 0, 0)`,
            transition: dragging ? "none" : "transform 300ms ease",
          }}
        >
          {gallery.map((src, i) => (
            <div key={src} className="relative h-full w-full shrink-0">
              <Image
                src={src}
                alt={`${villa.name} — ${i + 1}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={i === 0}
                draggable={false}
                className="select-none object-cover"
              />
            </div>
          ))}
        </div>

        {gallery.length > 1 && (
          <>
            {/* Ok'lar — yalnızca hover'da belirir, karta tıklamayı tetiklemez */}
            <button
              type="button"
              onClick={(e) => go(e, -1)}
              aria-label="Önceki fotoğraf"
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/70 p-1.5 text-brand-900 opacity-0 shadow backdrop-blur transition group-hover:opacity-100 hover:bg-white focus-visible:opacity-100"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => go(e, 1)}
              aria-label="Sonraki fotoğraf"
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/70 p-1.5 text-brand-900 opacity-0 shadow backdrop-blur transition group-hover:opacity-100 hover:bg-white focus-visible:opacity-100"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            {/* Nokta göstergeleri */}
            <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
              {gallery.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIdx(i);
                  }}
                  aria-label={`${i + 1}. fotoğraf`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}

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
        {/* Ad + konum */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-xl font-extrabold leading-none tracking-tight text-brand-950">
              {villa.name}
            </div>
            <div className="mt-1 text-xs text-brand-900/45">{code}</div>
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
