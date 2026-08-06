"use client";

import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShieldCheck,
  Lock,
  Headphones,
  BadgePercent,
  ArrowRight,
} from "lucide-react";
import HeroMedia from "@/components/HeroMedia";
import SearchBar from "@/components/SearchBar";
import VillaCard from "@/components/VillaCard";
import ShortStayDeals from "@/components/ShortStayDeals";
import CategorySection from "@/components/CategorySection";
import CategoryBrowser from "@/components/CategoryBrowser";
import AdBanner from "@/components/AdBanner";
import { useI18n } from "@/lib/i18n";
import type { Villa } from "@/lib/types";
import type { Region } from "@/lib/data/villas";
import type { Category } from "@/lib/data/categories";
import type { SiteSettings } from "@/lib/data/site";

export default function HomeClient({
  villas,
  featured,
  regions,
  categories,
  site,
}: {
  villas: Villa[];
  featured: Villa[];
  regions: Region[];
  categories: Category[];
  site: SiteSettings;
}) {
  const { t, lang } = useI18n();

  const why = [
    { icon: ShieldCheck, title: t("home.why1Title"), desc: t("home.why1Desc") },
    { icon: Lock, title: t("home.why2Title"), desc: t("home.why2Desc") },
    { icon: Headphones, title: t("home.why3Title"), desc: t("home.why3Desc") },
    { icon: BadgePercent, title: t("home.why4Title"), desc: t("home.why4Desc") },
  ];

  const featuredCategories = categories.filter((c) => c.featuredOnHome);

  const inRegion = (name: string) => villas.filter((v) => v.region === name);
  const regionCount = (name: string) => inRegion(name).length;

  /** Panelden yüklenen bölge görseli yoksa o bölgedeki bir villanın fotoğrafı. */
  const regionImage = (r: Region) =>
    r.heroImage ?? inRegion(r.name).find((v) => v.images[0])?.images[0] ?? null;

  // Site geneli görsel ayarlanmadıysa vitrindeki villalardan biri devreye girer.
  const showcaseImage =
    [...featured, ...villas].find((v) => v.images[0])?.images[0] ?? null;
  const heroImage = site.heroImage ?? showcaseImage;

  // Panelden girilen hero metni varsa sözlüktekinin yerine geçer; alt başlık
  // yalnızca doldurulduğunda görünür (varsayılan tasarımda yok).
  const heroTitle =
    (lang === "tr" ? site.heroTitleTr : site.heroTitleEn) ?? t("hero.title");
  const heroSubtitle =
    lang === "tr" ? site.heroSubtitleTr : site.heroSubtitleEn;

  return (
    <div>
      {/* HERO */}
      <section className="relative z-20">
        <HeroMedia image={heroImage} videoUrl={site.heroVideoUrl} />

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20">
          <div className="animate-fade-up text-center">
            <h1 className="title-gradient mx-auto max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-[3.5rem]">
              {heroTitle}
            </h1>
            {heroSubtitle && (
              <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-brand-900/80 sm:text-lg">
                {heroSubtitle}
              </p>
            )}
          </div>

          <div className="mt-8 animate-fade-up">
            <SearchBar regions={regions} />
          </div>
        </div>
      </section>

      {/* CATEGORY BROWSER */}
      <CategoryBrowser categories={categories} />

      {/* REKLAM ALANI (web: yatay · mobil: dikey) */}
      <AdBanner />

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">
              {t("home.featured")}
            </h2>
            <p className="mt-2 text-brand-900/60">{t("home.featuredSub")}</p>
          </div>
          <Link
            href="/villalar"
            className="hidden shrink-0 items-center gap-1.5 rounded-full border border-brand-200 px-4 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 sm:inline-flex"
          >
            {t("home.viewAll")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((v) => (
            <VillaCard key={v.slug} villa={v} />
          ))}
        </div>
      </section>

      {/* CATEGORY ROWS (+ fırsatlar arada) */}
      {featuredCategories.map((cat, i) => (
        <Fragment key={cat.slug}>
          <CategorySection
            category={cat}
            allVillas={villas}
            tinted={i % 2 === 1}
          />
          {i === 0 && <ShortStayDeals />}
        </Fragment>
      ))}

      {/* REGIONS */}
      <section id="regions" className="bg-sand-50 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">
              {t("home.regions")}
            </h2>
            <p className="mt-2 text-brand-900/60">{t("home.regionsSub")}</p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((r, i) => (
              <Link
                key={r.slug}
                href={`/villalar?region=${encodeURIComponent(r.name)}`}
                className="group relative aspect-[16/10] overflow-hidden rounded-2xl bg-brand-800"
              >
                {regionImage(r) && (
                  <Image
                    src={regionImage(r)!}
                    alt={r.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-110"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 p-5">
                  <h3 className="text-xl font-bold text-white">{r.name}</h3>
                  <p className="text-sm text-brand-100">
                    {r.province} · {regionCount(r.name)}{" "}
                    {lang === "tr" ? "villa" : "villas"}
                  </p>
                </div>
                {i === 0 && (
                  <span className="absolute right-4 top-4 rounded-full bg-sun-500 px-2.5 py-1 text-xs font-bold text-white">
                    {lang === "tr" ? "Popüler" : "Popular"}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section id="about" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <h2 className="text-center text-2xl font-extrabold text-brand-950 sm:text-3xl">
          {t("home.whyTitle")}
        </h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {why.map((w) => (
            <div
              key={w.title}
              className="rounded-2xl border border-sand-200 bg-white p-6 text-center shadow-sm transition hover:shadow-md"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <w.icon className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-bold text-brand-950">{w.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-900/60">
                {w.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl bg-brand-800 px-6 py-14 text-center sm:px-12">
          {showcaseImage && (
            <div className="absolute inset-0 opacity-20">
              <Image
                src={showcaseImage}
                alt=""
                fill
                sizes="(max-width: 1280px) 100vw, 1280px"
                className="object-cover"
              />
            </div>
          )}
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
              {t("home.ctaTitle")}
            </h2>
            <p className="mt-3 text-brand-100">{t("home.ctaDesc")}</p>
            <button className="mt-6 inline-flex items-center gap-2 rounded-full bg-sun-500 px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-sun-600">
              {t("home.ctaBtn")} <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
