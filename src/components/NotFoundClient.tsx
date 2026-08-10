"use client";

import Link from "next/link";
import { Compass, Home, Search, ArrowRight, MapPin, Sparkles, PhoneCall } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function NotFoundClient() {
  const { lang } = useI18n();

  const isTr = lang === "tr";

  const popularQuickLinks = [
    {
      title: isTr ? "Tüm Villalar" : "All Villas",
      desc: isTr ? "Tüm seçkin kiralık villaları listeleyin" : "Browse all luxury rental villas",
      href: "/villalar",
      icon: Home,
      color: "bg-brand-50 text-brand-600 border-brand-100",
    },
    {
      title: isTr ? "Popüler Bölgeler" : "Popular Regions",
      desc: isTr ? "Kalkan, Kaş, Fethiye ve daha fazlası" : "Kalkan, Kas, Fethiye and more",
      href: "/villalar#regions",
      icon: MapPin,
      color: "bg-sun-50 text-sun-600 border-sun-100",
    },
    {
      title: isTr ? "Öne Çıkan Fırsatlar" : "Featured Deals",
      desc: isTr ? "Son dakika indirimleri ve özel fiyatlar" : "Last minute deals & special prices",
      href: "/villalar",
      icon: Sparkles,
      color: "bg-amber-50 text-amber-600 border-amber-100",
    },
    {
      title: isTr ? "İletişim & Destek" : "Contact & Support",
      desc: isTr ? "7/24 tatil danışmanlarımızla görüşün" : "Talk with our 24/7 holiday advisors",
      href: "/#about",
      icon: PhoneCall,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
  ];

  return (
    <div className="relative min-h-[70vh] flex items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
      {/* Arka plan dekoratif işıklar */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-tr from-sun-300/20 to-brand-300/20 blur-3xl" />
        <div className="absolute bottom-0 right-10 -z-10 h-72 w-72 rounded-full bg-brand-400/10 blur-2xl" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        {/* Rozet */}
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-200/80 bg-brand-50/80 px-4 py-1.5 text-xs sm:text-sm font-semibold text-brand-800 shadow-sm backdrop-blur-sm">
          <Compass className="h-4 w-4 text-sun-500 animate-spin-slow" />
          <span>{isTr ? "Hata 404 — Sayfa Bulunamadı" : "Error 404 — Page Not Found"}</span>
        </div>

        {/* Dev 404 Metni */}
        <h1 className="mt-6 text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-brand-950 via-brand-800 to-sun-600 sm:text-9xl">
          404
        </h1>

        {/* Başlık ve Açıklama */}
        <h2 className="mt-4 text-2xl font-extrabold text-brand-950 sm:text-3xl">
          {isTr ? "Aradığınız Rota Bulunamadı" : "Page Lost at Sea"}
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-brand-900/70 sm:text-lg leading-relaxed">
          {isTr
            ? "Aradığınız tatil villası veya sayfa kaldırılmış, adresi değişmiş ya da geçici olarak erişilemiyor olabilir."
            : "The page or villa you are looking for might have been removed, had its name changed, or is temporarily unavailable."}
        </p>

        {/* Ana Butonlar */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-brand-800 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-900/15 transition hover:bg-brand-900 active:scale-95"
          >
            <Home className="h-4 w-4" />
            <span>{isTr ? "Ana Sayfaya Dön" : "Back to Home"}</span>
          </Link>
          <Link
            href="/villalar"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full border border-sand-300 bg-white px-7 py-3.5 text-sm font-bold text-brand-900 shadow-sm transition hover:bg-sand-50 active:scale-95"
          >
            <Search className="h-4 w-4 text-brand-600" />
            <span>{isTr ? "Tüm Villaları İncele" : "Explore All Villas"}</span>
          </Link>
        </div>

        {/* Hızlı Linkler Kartları */}
        <div className="mt-14 grid gap-4 sm:grid-cols-2 text-left">
          {popularQuickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group relative flex items-start gap-4 rounded-2xl border border-sand-200/80 bg-white/80 p-4 shadow-sm backdrop-blur-sm transition duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-md"
              >
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${item.color} transition group-hover:scale-110`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-brand-950 group-hover:text-brand-700 transition">
                      {item.title}
                    </h3>
                    <ArrowRight className="h-4 w-4 text-brand-400 opacity-0 -translate-x-2 transition duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                  </div>
                  <p className="mt-1 text-xs text-brand-900/60 leading-snug">
                    {item.desc}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
