"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Category } from "@/lib/data/categories";
import { CategoryIcon } from "@/lib/categoryIcons";
import { isValidImageUrl } from "@/lib/imageUtils";

const short = (s: string) => s.replace(/ Villaları$| Villalar$| Villas$/, "");

function CategoryItem({
  cat,
  lang,
  hasDraggedRef,
}: {
  cat: Category;
  lang: string;
  hasDraggedRef: React.RefObject<boolean>;
}) {
  const [imgError, setImgError] = useState(false);
  const label = short(lang === "tr" ? cat.titleTr : cat.titleEn);
  const hasValidImage = isValidImageUrl(cat.image) && !imgError;

  return (
    <Link
      key={cat.slug}
      href={`/villalar?category=${cat.slug}`}
      onClick={(e) => {
        if (hasDraggedRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
      className="group w-[124px] shrink-0"
    >
      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-sand-100 flex items-center justify-center">
        {hasValidImage ? (
          <Image
            src={cat.image}
            alt={label}
            fill
            sizes="124px"
            className="object-cover transition duration-500 group-hover:scale-105"
            priority={false}
            draggable={false}
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-sand-200/70 text-brand-800 transition duration-300 group-hover:scale-105 group-hover:bg-sand-200">
            <CategoryIcon name={cat.iconName} className="h-8 w-8 text-brand-700" />
          </div>
        )}
      </div>
      <div className="mt-2 text-[13px] font-semibold leading-tight text-brand-900 transition group-hover:text-brand-700">
        {label}
      </div>
    </Link>
  );
}

export default function CategoryBrowser({
  categories,
}: {
  categories: Category[];
}) {
  const { lang } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const directionRef = useRef<"forward" | "backward">("forward");

  // Mouse Drag state refs
  const isMouseDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftStartRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  // Arrow button visibility state
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollBounds = () => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    checkScrollBounds();

    let isPaused = false;

    const handlePointerEnter = () => {
      isPaused = true;
    };
    const handlePointerLeave = () => {
      isPaused = false;
      isMouseDownRef.current = false;
      setIsDraggingState(false);
    };
    const handleTouchStart = () => {
      isPaused = true;
    };
    const handleTouchEnd = () => {
      setTimeout(() => {
        isPaused = false;
      }, 2000);
    };

    const handleScroll = () => {
      checkScrollBounds();
    };

    // Dikey fare tekerleğini yatay kaydırmaya çevir. Native + passive:false
    // ki sayfanın dikey kaymasını engelleyebilelim (React onWheel passive'dir,
    // orada preventDefault çalışmaz → hem şerit döner hem sayfa inerdi).
    const handleWheelNative = (e: WheelEvent) => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return; // kayacak yer yok → sayfaya bırak
      // Touchpad yatay jesti (deltaX baskın) zaten doğal yatay kaydırır; sadece
      // dikey baskın harekette devreye gir.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      const atStart = e.deltaY < 0 && el.scrollLeft <= 0;
      const atEnd = e.deltaY > 0 && el.scrollLeft >= maxScroll - 1;
      if (atStart || atEnd) return; // şerit sonunda → sayfaya devret
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    el.addEventListener("mouseenter", handlePointerEnter);
    el.addEventListener("mouseleave", handlePointerLeave);
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("scroll", handleScroll, { passive: true });
    el.addEventListener("wheel", handleWheelNative, { passive: false });

    const interval = setInterval(() => {
      if (isPaused || isMouseDownRef.current || !containerRef.current) return;

      const container = containerRef.current;
      const maxScroll = container.scrollWidth - container.clientWidth;

      if (maxScroll <= 0) return;

      const step = 150;

      if (directionRef.current === "forward") {
        if (container.scrollLeft >= maxScroll - 10) {
          directionRef.current = "backward";
          container.scrollBy({ left: -step, behavior: "smooth" });
        } else {
          container.scrollBy({ left: step, behavior: "smooth" });
        }
      } else {
        if (container.scrollLeft <= 10) {
          directionRef.current = "forward";
          container.scrollBy({ left: step, behavior: "smooth" });
        } else {
          container.scrollBy({ left: -step, behavior: "smooth" });
        }
      }
    }, 3000);

    return () => {
      clearInterval(interval);
      el.removeEventListener("mouseenter", handlePointerEnter);
      el.removeEventListener("mouseleave", handlePointerLeave);
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("scroll", handleScroll);
      el.removeEventListener("wheel", handleWheelNative);
    };
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    isMouseDownRef.current = true;
    startXRef.current = e.pageX - el.offsetLeft;
    scrollLeftStartRef.current = el.scrollLeft;
    hasDraggedRef.current = false;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDownRef.current || !containerRef.current) return;
    const el = containerRef.current;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startXRef.current) * 1.5;

    if (Math.abs(walk) > 5) {
      hasDraggedRef.current = true;
      if (!isDraggingState) setIsDraggingState(true);
    }

    el.scrollLeft = scrollLeftStartRef.current - walk;
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setTimeout(() => {
      setIsDraggingState(false);
    }, 50);
  };

  const scrollByAmount = (amount: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="relative mx-auto max-w-7xl px-8 py-6 sm:px-10 group/section">
      {/* SOL OK BUTONU */}
      {canScrollLeft && (
        <button
          onClick={() => scrollByAmount(-250)}
          className="absolute left-2 top-[86px] z-10 -translate-y-1/2 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm border border-sand-200 text-brand-900 transition hover:bg-white hover:scale-110 active:scale-95"
          aria-label="Sola kaydır"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* SAĞ OK BUTONU */}
      {canScrollRight && (
        <button
          onClick={() => scrollByAmount(250)}
          className="absolute right-2 top-[86px] z-10 -translate-y-1/2 hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm border border-sand-200 text-brand-900 transition hover:bg-white hover:scale-110 active:scale-95"
          aria-label="Sağa kaydır"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* KATEGORİ LİSTESİ */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`no-scrollbar -mx-8 flex gap-3 overflow-x-auto px-8 pb-2 sm:mx-0 sm:px-0 select-none ${
          isDraggingState ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {categories.map((cat) => (
          <CategoryItem
            key={cat.slug}
            cat={cat}
            lang={lang}
            hasDraggedRef={hasDraggedRef}
          />
        ))}
      </div>
    </section>
  );
}



