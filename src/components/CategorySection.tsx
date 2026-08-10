"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import VillaCard from "./VillaCard";
import { useI18n } from "@/lib/i18n";
import { CategoryIcon } from "@/lib/categoryIcons";
import type { Villa } from "@/lib/types";
import type { Category } from "@/lib/data/categories";

export default function CategorySection({
  category,
  allVillas,
  tinted = false,
}: {
  category: Category;
  /** Sunucudan gelen villa listesi — kategori slug'ları buradan çözülür */
  allVillas: Villa[];
  tinted?: boolean;
}) {
  const { t, lang } = useI18n();
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  // Mouse ile tut-sürükle (üst kategori şeridiyle aynı davranış).
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollRef = useRef(0);
  const draggedRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const handleDown = (e: React.MouseEvent) => {
    const el = scroller.current;
    if (!el) return;
    isDownRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollRef.current = el.scrollLeft;
    draggedRef.current = false;
  };

  const handleMove = (e: React.MouseEvent) => {
    const el = scroller.current;
    if (!isDownRef.current || !el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    // 1:1 takip — çarpan büyüdükçe imleçle içerik arasında kayma hissi doğuyor.
    const walk = x - startXRef.current;
    if (Math.abs(walk) > 5) {
      draggedRef.current = true;
      if (!dragging) setDragging(true);
    }
    el.scrollLeft = startScrollRef.current - walk;
  };

  const handleUp = () => {
    isDownRef.current = false;
    setTimeout(() => setDragging(false), 50);
  };

  const bySlug = new Map(allVillas.map((v) => [v.slug, v]));
  const villas = category.villaSlugs
    .map((slug) => bySlug.get(slug))
    .filter((v): v is Villa => Boolean(v));

  const update = () => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  return (
    <section className={tinted ? "bg-sand-50 py-8" : "py-8"}>
      <div className="mx-auto max-w-7xl px-8 sm:px-10">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <CategoryIcon name={category.iconName} className="h-6 w-6" />
            </span>
            <div>
              <h2 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">
                {lang === "tr" ? category.titleTr : category.titleEn}
              </h2>
              <p className="mt-1 text-brand-900/60">
                {lang === "tr" ? category.descTr : category.descEn}
              </p>
            </div>
          </div>

          <Link
            href={`/villalar?category=${category.slug}`}
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 sm:inline-flex"
          >
            {t("home.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Yana kaydırmalı villa listesi — oklar şeridin sol/sağ kenarında */}
        <div className="relative">
          {/* SOL OK — görsel hizasında, yalnızca kaydırılacak yer varsa */}
          {canLeft && (
            <button
              onClick={() => scroll(-1)}
              aria-label="Önceki"
              className="absolute left-1 top-[124px] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-sand-200 bg-white/95 text-brand-800 shadow-md backdrop-blur-sm transition hover:scale-110 hover:bg-white active:scale-95 sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}
          {/* SAĞ OK */}
          {canRight && (
            <button
              onClick={() => scroll(1)}
              aria-label="Sonraki"
              className="absolute right-1 top-[124px] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-sand-200 bg-white/95 text-brand-800 shadow-md backdrop-blur-sm transition hover:scale-110 hover:bg-white active:scale-95 sm:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div
            ref={scroller}
            onScroll={update}
            onMouseDown={handleDown}
            onMouseMove={handleMove}
            onMouseUp={handleUp}
            onMouseLeave={handleUp}
            onDragStart={(e) => e.preventDefault()}
            onClickCapture={(e) => {
              // Sürükleme sonrası oluşan tıklamayı yut — karta girmesin.
              if (draggedRef.current) {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
            className={`no-scrollbar -mx-8 mt-6 flex gap-5 overflow-x-auto px-8 pb-2 sm:mx-0 sm:px-0 ${
              dragging
                ? "cursor-grabbing snap-none select-none"
                : "cursor-grab snap-x snap-proximity"
            }`}
          >
            {villas.map((v) => (
              <div
                key={v.slug}
                className="w-[280px] shrink-0 snap-start sm:w-[320px]"
              >
                <VillaCard villa={v} />
              </div>
            ))}
          </div>
        </div>

        {/* Mobil "Tümünü Gör" */}
        <div className="mt-6 text-center sm:hidden">
          <Link
            href={`/villalar?category=${category.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-5 py-2.5 text-sm font-semibold text-brand-700"
          >
            {t("home.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
