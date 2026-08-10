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
  MapPin,
  Star,
  Home,
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

  const featuredCategories = categories.filter((c) => c.featuredOnHome === true);

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

        <div className="relative mx-auto max-w-7xl px-8 pb-8 pt-16 sm:px-10 sm:pt-20">
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
      <CategoryBrowser categories={categories.filter((c) => c.showInBrowser !== false)} />

      {/* REKLAM ALANI — web/mobil ayrı görsel, panelden yönetilir */}
      <AdBanner
        web={site.adShowWeb ? site.adWebImage : null}
        mobile={site.adShowMobile ? site.adMobileImage : null}
        link={site.adLinkUrl || "/villalar"}
      />

      {/* FEATURED */}
      <section className="mx-auto max-w-7xl px-8 py-8 sm:px-10">
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
      <section id="regions" className="bg-sand-50 py-14">
        <div className="mx-auto max-w-7xl px-8 sm:px-10">
          <div className="text-center">
            <h2 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">
              {t("home.regions")}
            </h2>
            <p className="mt-2 text-brand-900/60">{t("home.regionsSub")}</p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {regions.map((r, i) => {
              const href = r.parentSlug
                ? `/villalar/${r.parentSlug}/${r.slug}`
                : `/villalar/${r.slug}`;
              return (
                <Link
                  key={r.slug}
                  href={href}
                  className="group relative aspect-[16/11] overflow-hidden rounded-3xl bg-brand-800 shadow-sm ring-1 ring-black/5 transition duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
                >
                {regionImage(r) && (
                  <Image
                    src={regionImage(r)!}
                    alt={r.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition duration-700 ease-out group-hover:scale-110"
                  />
                )}
                {/* Katmanlı karartma — alt köşe okunaklı, hover'da hafif koyulaşır */}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-950 via-brand-950/25 to-transparent" />
                <div className="absolute inset-0 bg-brand-950/0 transition duration-300 group-hover:bg-brand-950/10" />

                {/* Villa sayısı — cam rozet */}
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-white/25 backdrop-blur-md">
                  <Home className="h-3.5 w-3.5" />
                  {regionCount(r.name)} {lang === "tr" ? "villa" : "villas"}
                </span>

                {/* Popüler rozeti */}
                {i === 0 && (
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sun-400 to-sun-600 px-3 py-1 text-xs font-bold text-white shadow-md">
                    <Star className="h-3.5 w-3.5 fill-white" />
                    {lang === "tr" ? "Popüler" : "Popular"}
                  </span>
                )}

                {/* Alt bilgi + keşfet oku */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <div className="flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl font-extrabold text-white drop-shadow-sm sm:text-2xl">
                        {r.name}
                      </h3>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-sm text-white/85">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {r.province}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 shrink-0 translate-y-2 items-center justify-center rounded-full bg-white/95 text-brand-900 opacity-0 shadow-lg transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section id="about" className="mx-auto max-w-7xl px-8 py-16 sm:px-10">
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
      <section className="mx-auto max-w-7xl px-8 pb-4 sm:px-10">
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
