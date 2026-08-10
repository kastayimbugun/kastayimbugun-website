"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight, Grid3x3, Maximize2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { isValidImageUrl } from "@/lib/imageUtils";

export default function Gallery({
  images,
  name,
}: {
  images: string[];
  name: string;
}) {
  const { t } = useI18n();
  const [mainIdx, setMainIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState(0);

  // Sadece geçerli URL'ye sahip fotoğrafları filtrele
  const validImages = images.filter((img) => isValidImageUrl(img));

  const openLightbox = (index: number) => {
    setLightboxIdx(index);
    setOpen(true);
  };

  const prevLightbox = () =>
    setLightboxIdx((i) => (i - 1 + validImages.length) % validImages.length);
  const nextLightbox = () =>
    setLightboxIdx((i) => (i + 1) % validImages.length);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft")
        setLightboxIdx((i) => (i - 1 + validImages.length) % validImages.length);
      if (e.key === "ArrowRight")
        setLightboxIdx((i) => (i + 1) % validImages.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, validImages.length]);

  if (!validImages.length) return null;

  const currentMainImage = validImages[mainIdx] || validImages[0];

  return (
    <>
      <div className="relative">
        {/* Ana Fotoğraf ve Masaüstü Grid Düzeni */}
        <div className="relative grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[420px]">
          {/* Üst / Sol Büyük Ana Görsel */}
          <div className="relative col-span-4 row-span-2 h-64 sm:col-span-2 sm:h-auto group cursor-pointer overflow-hidden rounded-xl sm:rounded-none">
            <Image
              key={currentMainImage}
              src={currentMainImage}
              alt={name}
              fill
              preload
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover transition duration-300 group-hover:scale-105"
              onClick={() => openLightbox(mainIdx)}
            />
            {/* Büyük Resme Tıklayınca Büyüt İpucu */}
            <button
              onClick={() => openLightbox(mainIdx)}
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition duration-200 text-white"
              aria-label="Tam ekran görüntüle"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-sm font-semibold backdrop-blur-sm">
                <Maximize2 className="h-4 w-4" /> Büyüt
              </span>
            </button>
          </div>

          {/* Masaüstü Yan Küçük Fotoğraflar */}
          {validImages.slice(1, 5).map((src, i) => {
            const actualIndex = i + 1;
            const isSelected = mainIdx === actualIndex;
            return (
              <button
                key={actualIndex}
                onClick={() => setMainIdx(actualIndex)}
                className={`relative hidden sm:block overflow-hidden transition duration-200 ${
                  isSelected
                    ? "ring-2 ring-brand-500 ring-offset-2 opacity-100"
                    : "hover:opacity-90 opacity-80"
                }`}
              >
                <Image
                  src={src}
                  alt={`${name} ${actualIndex + 1}`}
                  fill
                  sizes="25vw"
                  className="object-cover"
                />
              </button>
            );
          })}

          {/* "Tüm fotoğrafları gör" Butonu */}
          <button
            onClick={() => openLightbox(mainIdx)}
            className="absolute bottom-3 right-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3.5 py-2 text-xs sm:text-sm font-semibold text-brand-900 shadow-md backdrop-blur-sm transition hover:bg-white hover:scale-105 active:scale-95"
          >
            <Grid3x3 className="h-4 w-4 text-brand-700" />
            {t("detail.showAllPhotos")} ({validImages.length})
          </button>
        </div>

        {/* Mobil Küçük Fotoğraf Önizleme Şeridi (Küçük fotoğrafa basınca ana resim değişir) */}
        {validImages.length > 1 && (
          <div className="no-scrollbar mt-2.5 flex gap-2 overflow-x-auto pb-1 sm:hidden">
            {validImages.map((src, i) => {
              const isSelected = mainIdx === i;
              return (
                <button
                  key={i}
                  onClick={() => setMainIdx(i)}
                  className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border-2 transition duration-200 ${
                    isSelected
                      ? "border-brand-600 ring-2 ring-brand-500/40 scale-95"
                      : "border-transparent opacity-75 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`${name} ${i + 1}`}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Tam Ekran Lightbox Slider Modal */}
      {open && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-brand-950/95 backdrop-blur-md">
          {/* Üst Bar */}
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm font-medium tracking-wide">
              {lightboxIdx + 1} / {validImages.length}
            </span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white transition"
              aria-label="Kapat"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tam Ekran Görsel */}
          <div className="relative flex-1">
            <Image
              src={validImages[lightboxIdx]}
              alt={`${name} ${lightboxIdx + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
            <button
              onClick={prevLightbox}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
              aria-label="Önceki"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
            <button
              onClick={nextLightbox}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 p-3 text-white backdrop-blur-sm transition hover:bg-black/60 active:scale-95"
              aria-label="Sonraki"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>

          {/* Alt Küçük Resim Şeridi */}
          <div className="no-scrollbar flex gap-2 overflow-x-auto p-4 bg-black/40">
            {validImages.map((src, i) => (
              <button
                key={i}
                onClick={() => setLightboxIdx(i)}
                className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                  i === lightboxIdx
                    ? "border-amber-400 ring-2 ring-amber-400/50 opacity-100"
                    : "border-transparent opacity-50 hover:opacity-80"
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

