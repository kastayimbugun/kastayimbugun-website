"use client";

import Link from "next/link";
import { CircleCheck, ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function ApplicationThanksPage() {
  const { t } = useI18n();

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="animate-fade-up mx-auto w-full max-w-lg rounded-2xl border border-sand-200 bg-white p-8 text-center shadow-sm sm:p-10">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 ring-8 ring-emerald-50/60">
          <CircleCheck className="h-11 w-11" strokeWidth={2} />
        </div>

        <h1 className="mt-6 text-2xl font-extrabold text-brand-950 sm:text-3xl">
          {t("applyThanks.title")}
        </h1>

        <p className="mt-3 leading-relaxed text-brand-900/60">
          {t("applyThanks.desc")}
        </p>

        <p className="mt-4 text-sm leading-relaxed text-brand-900/50">
          {t("applyThanks.contactNote")}
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-sun-500 px-7 py-3 font-semibold text-white shadow-lg transition hover:bg-sun-600"
          >
            {t("applyThanks.backHome")} <ArrowRight className="h-5 w-5" />
          </Link>
          <Link
            href="/villalar"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-brand-200 px-7 py-3 font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            {t("applyThanks.browseVillas")}
          </Link>
        </div>
      </div>
    </section>
  );
}
