"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Grid3x3 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Gallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const show = (i: number) => {
    setIdx(i);
    setOpen(true);
  };
  const prev = () => setIdx((i) => (i - 1 + images.length) % images.length);
  const next = () => setIdx((i) => (i + 1) % images.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <div className="relative grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[420px]">
        <button
          onClick={() => show(0)}
          className="relative col-span-4 row-span-2 h-56 sm:col-span-2 sm:h-auto"
        >
          <Image
            src={images[0]}
            alt={name}
            fill
            priority
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover transition hover:brightness-95"
          />
        </button>
        {images.slice(1, 5).map((src, i) => (
          <button
            key={i}
            onClick={() => show(i + 1)}
            className="relative hidden sm:block"
          >
            <Image
              src={src}
              alt={`${name} ${i + 2}`}
              fill
              sizes="25vw"
              className="object-cover transition hover:brightness-95"
            />
          </button>
        ))}
        <button
          onClick={() => show(0)}
          className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 text-sm font-semibold text-brand-900 shadow hover:bg-white"
        >
          <Grid3x3 className="h-4 w-4" />
          {t("detail.showAllPhotos")}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-brand-950/95">
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm font-medium">
              {idx + 1} / {images.length}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-2 hover:bg-white/10"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              src={images[idx]}
              alt={`${name} ${idx + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
            <button
              onClick={prev}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={next}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-3 text-white hover:bg-white/25"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
          <div className="no-scrollbar flex gap-2 overflow-x-auto p-4">
            {images.map((src, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition ${
                  i === idx ? "ring-sun-500" : "ring-transparent opacity-70"
                }`}
              >
                <Image src={src} alt="" fill className="object-cover" sizes="96px" />
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
