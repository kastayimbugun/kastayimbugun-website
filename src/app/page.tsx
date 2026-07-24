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
import SearchBar from "@/components/SearchBar";
import VillaCard from "@/components/VillaCard";
import ShortStayDeals from "@/components/ShortStayDeals";
import CategorySection from "@/components/CategorySection";
import CategoryBrowser from "@/components/CategoryBrowser";
import AdBanner from "@/components/AdBanner";
import { useI18n } from "@/lib/i18n";
import { getFeatured, regions, villas } from "@/lib/villas";
import { featuredCategories } from "@/lib/categories";

const HERO_VIDEO_ID = "0iQLhONQlgM";

export default function Home() {
  const { t, lang } = useI18n();
  const featured = getFeatured();

  const why = [
    { icon: ShieldCheck, title: t("home.why1Title"), desc: t("home.why1Desc") },
    { icon: Lock, title: t("home.why2Title"), desc: t("home.why2Desc") },
    { icon: Headphones, title: t("home.why3Title"), desc: t("home.why3Desc") },
    { icon: BadgePercent, title: t("home.why4Title"), desc: t("home.why4Desc") },
  ];

  const regionCount = (name: string) =>
    villas.filter((v) => v.region === name).length;

  return (
    <div>
      {/* HERO */}
      <section className="relative z-20">
        <div className="absolute inset-0 overflow-hidden bg-brand-950">
          {/* Poster — video yüklenene kadar */}
          <Image
            src="https://picsum.photos/seed/villahero/1920/1080"
            alt=""
            fill
            priority
            className="object-cover"
          />
          {/* Arka plan videosu */}
          <iframe
            title="Villa arka plan videosu"
            src={`https://www.youtube.com/embed/${HERO_VIDEO_ID}?autoplay=1&mute=1&loop=1&playlist=${HERO_VIDEO_ID}&controls=0&showinfo=0&rel=0&modestbranding=1&playsinline=1&disablekb=1&fs=0&iv_load_policy=3`}
            allow="autoplay; encrypted-media"
            className="pointer-events-none absolute left-1/2 top-1/2 border-0"
            style={{
              width: "max(100%, 177.78vh)",
              height: "max(100%, 56.25vw)",
              transform: "translate(-50%, -50%) scale(1.45)",
            }}
          />
          {/* Metin okunurluğu için koyu degrade */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-950/75 via-brand-950/40 to-brand-950/25" />
          {/* Alt kenarda kademeli beyaz geçiş — beyaz bölüme yumuşak birleşim */}
          <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-white via-white/75 to-transparent" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-20">
          <div className="animate-fade-up text-center">
            <h1 className="title-gradient mx-auto max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-[3.5rem]">
              {t("hero.title")}
            </h1>
          </div>

          <div className="mt-8 animate-fade-up">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* CATEGORY BROWSER */}
      <CategoryBrowser />

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
          <CategorySection category={cat} tinted={i % 2 === 1} />
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
                className="group relative aspect-[16/10] overflow-hidden rounded-2xl"
              >
                <Image
                  src={`https://picsum.photos/seed/region-${r.slug}/800/500`}
                  alt={r.name}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-110"
                />
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
          <div className="absolute inset-0 opacity-20">
            <Image
              src="https://picsum.photos/seed/villacta/1600/600"
              alt=""
              fill
              className="object-cover"
            />
          </div>
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
