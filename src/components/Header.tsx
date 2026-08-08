"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Heart, Globe, User, Menu, X, ShieldCheck } from "lucide-react";
import Logo from "./Logo";
import { useI18n, type Lang } from "@/lib/i18n";
import {
  DEFAULT_HEADER_CONFIG,
  type HeaderConfig,
} from "@/lib/headerFooter";

function LangSwitch() {
  const { lang, setLang } = useI18n();
  const next: Lang = lang === "tr" ? "en" : "tr";
  return (
    <button
      onClick={() => setLang(next)}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition"
      aria-label="Change language"
    >
      <Globe className="h-4 w-4" />
      {lang.toUpperCase()}
    </button>
  );
}

export default function Header({
  config = DEFAULT_HEADER_CONFIG,
}: {
  config?: HeaderConfig;
}) {
  const { lang } = useI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const nav = config.menu.map((m) => ({
    href: m.href,
    label: lang === "en" ? m.labelEn : m.labelTr,
    id: m.id,
  }));
  const cta = config.cta;
  const ctaLabel = lang === "en" ? cta.labelEn : cta.labelTr;

  return (
    <header className="sticky top-0 z-50">
      {/* TÜRSAB güven şeridi */}
      {config.topbar.enabled && (
        <div className="bg-brand-950 text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2.5 gap-y-1 px-4 py-1.5 text-center sm:px-6">
            <ShieldCheck className="h-4 w-4 shrink-0 text-sun-400" />
            <span className="text-[11px] font-medium text-white/90 sm:text-xs">
              {lang === "en" ? config.topbar.textEn : config.topbar.textTr}
            </span>
            {(config.topbar.badgeTr || config.topbar.badgeEn) && (
              <>
                <span className="hidden text-white/30 sm:inline">•</span>
                <span className="rounded-full bg-sun-500 px-2.5 py-0.5 text-[11px] font-bold text-brand-950">
                  {lang === "en" ? config.topbar.badgeEn : config.topbar.badgeTr}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      <div
        className={`transition-all ${
          scrolled
            ? "bg-white/90 backdrop-blur border-b border-sand-200 shadow-sm"
            : "bg-white border-b border-sand-100"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((n) => (
              <Link
                key={n.id}
                href={n.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-brand-900/80 hover:bg-brand-50 hover:text-brand-900 transition"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-1 md:flex">
            <LangSwitch />
            <button className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-50 transition">
              <Heart className="h-4 w-4" />
            </button>
            {cta.enabled && (
              <Link
                href={cta.href}
                className="ml-1 inline-flex items-center gap-2 rounded-full bg-sun-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sun-600 transition"
              >
                <User className="h-4 w-4" />
                {ctaLabel}
              </Link>
            )}
          </div>

          <button
            className="md:hidden rounded-lg p-2 text-brand-900 hover:bg-brand-50"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {open && (
          <div className="border-t border-sand-200 bg-white md:hidden">
            <div className="mx-auto max-w-7xl px-4 py-3">
              {nav.map((n) => (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-3 py-2.5 text-base font-medium text-brand-900 hover:bg-brand-50"
                >
                  {n.label}
                </Link>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-sand-200 pt-3">
                <LangSwitch />
                {cta.enabled && (
                  <Link
                    href={cta.href}
                    onClick={() => setOpen(false)}
                    className="inline-flex items-center gap-2 rounded-full bg-sun-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    <User className="h-4 w-4" />
                    {ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
