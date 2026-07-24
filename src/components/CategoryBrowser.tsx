"use client";

import Image from "next/image";
import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { villaCategories } from "@/lib/categories";

const short = (s: string) => s.replace(/ Villaları$| Villalar$| Villas$/, "");

export default function CategoryBrowser() {
  const { lang } = useI18n();

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {villaCategories.map((cat) => {
          const label = short(lang === "tr" ? cat.titleTr : cat.titleEn);
          return (
            <Link
              key={cat.slug}
              href={`/villalar?category=${cat.slug}`}
              className="group w-[124px] shrink-0"
            >
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-sand-100">
                <Image
                  src={cat.image}
                  alt={label}
                  fill
                  sizes="124px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                  priority={false}
                />
              </div>
              <div className="mt-2 text-[13px] font-semibold leading-tight text-brand-900 transition group-hover:text-brand-700">
                {label}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
