"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import VillaCard from "./VillaCard";
import { useI18n } from "@/lib/i18n";
import { getVilla } from "@/lib/villas";
import type { Villa } from "@/lib/types";
import type { VillaCategory } from "@/lib/categories";

export default function CategorySection({
  category,
  tinted = false,
}: {
  category: VillaCategory;
  tinted?: boolean;
}) {
  const { t, lang } = useI18n();
  const Icon = category.icon;
  const scroller = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const villas = category.villaSlugs
    .map(getVilla)
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Icon className="h-6 w-6" />
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

          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <Link
              href={`/villalar?category=${category.slug}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
            >
              {t("home.viewAll")} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={() => scroll(-1)}
              disabled={!canLeft}
              aria-label="Önceki"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-200 bg-white text-brand-800 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => scroll(1)}
              disabled={!canRight}
              aria-label="Sonraki"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-sand-200 bg-white text-brand-800 transition hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Yana kaydırmalı villa listesi */}
        <div
          ref={scroller}
          onScroll={update}
          className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth px-4 pb-2 sm:mx-0 sm:px-0"
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
