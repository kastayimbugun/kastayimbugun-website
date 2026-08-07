"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import type { Category } from "@/lib/data/categories";

const short = (s: string) => s.replace(/ Villaları$| Villalar$| Villas$/, "");

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

    el.addEventListener("mouseenter", handlePointerEnter);
    el.addEventListener("mouseleave", handlePointerLeave);
    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    el.addEventListener("scroll", handleScroll, { passive: true });

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

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    if (e.deltaY !== 0) {
      el.scrollLeft += e.deltaY;
    }
  };

  const scrollByAmount = (amount: number) => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <section className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 group/section">
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
        onWheel={handleWheel}
        className={`no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 select-none ${
          isDraggingState ? "cursor-grabbing" : "cursor-grab"
        }`}
      >
        {categories.map((cat) => {
          const label = short(lang === "tr" ? cat.titleTr : cat.titleEn);
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
              <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-sand-100">
                <Image
                  src={cat.image}
                  alt={label}
                  fill
                  sizes="124px"
                  className="object-cover transition duration-500 group-hover:scale-105"
                  priority={false}
                  draggable={false}
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


