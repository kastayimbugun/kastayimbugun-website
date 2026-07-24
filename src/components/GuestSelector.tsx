"use client";

import { useEffect, useRef, useState } from "react";
import { Users, Minus, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface GuestCounts {
  adults: number;
  children: number;
  babies: number;
}

export default function GuestSelector({
  value,
  onChange,
  label,
  max,
}: {
  value: GuestCounts;
  onChange: (c: GuestCounts) => void;
  /** Tetikleyicideki üst etiket (varsayılan "Kişi") */
  label?: string;
  /** Yetişkin + çocuk toplamı için üst sınır (kapasite) */
  max?: number;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const totalPeople = value.adults + value.children;
  const summary =
    totalPeople === 0 && value.babies === 0
      ? t("guest.placeholder")
      : [
          `${totalPeople} ${t("guest.summary")}`,
          value.babies > 0 ? `${value.babies} ${t("guest.baby")}` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const rows: {
    key: keyof GuestCounts;
    title: string;
    age: string;
    min: number;
  }[] = [
    { key: "adults", title: t("guest.adults"), age: t("guest.adultsAge"), min: 0 },
    { key: "children", title: t("guest.children"), age: t("guest.childrenAge"), min: 0 },
    { key: "babies", title: t("guest.babies"), age: t("guest.babiesAge"), min: 0 },
  ];

  const peopleAtMax = max != null && totalPeople >= max;

  const step = (key: keyof GuestCounts, delta: number, min: number) => {
    // Yetişkin/çocuk artışı kapasiteyi aşamaz
    if (delta > 0 && key !== "babies" && peopleAtMax) return;
    onChange({ ...value, [key]: Math.max(min, value[key] + delta) });
  };

  return (
    <div ref={ref} className="relative flex-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:bg-sand-50"
      >
        <Users className="h-5 w-5 shrink-0 text-brand-500" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-brand-900/45">
            {label ?? t("search.guests")}
          </div>
          <div
            className={`truncate text-sm font-semibold ${
              totalPeople === 0 && value.babies === 0
                ? "text-brand-900/40"
                : "text-brand-950"
            }`}
          >
            {summary}
          </div>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl border border-sand-200 bg-white p-4 shadow-2xl ring-1 ring-black/5">
          <div className="divide-y divide-sand-100">
            {rows.map((r) => (
              <div key={r.key} className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-bold text-brand-950">
                    {r.title}
                  </div>
                  <div className="text-xs text-brand-900/50">{r.age}</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => step(r.key, -1, r.min)}
                    disabled={value[r.key] <= r.min}
                    aria-label="−"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-sand-300 text-brand-700 transition hover:border-brand-400 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-5 text-center text-sm font-bold text-brand-950">
                    {value[r.key]}
                  </span>
                  <button
                    type="button"
                    onClick={() => step(r.key, 1, r.min)}
                    disabled={r.key !== "babies" && peopleAtMax}
                    aria-label="+"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-sand-300 text-brand-700 transition hover:border-brand-400 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-sand-100 pt-3">
            <button
              type="button"
              onClick={() => onChange({ adults: 0, children: 0, babies: 0 })}
              className="text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
            >
              {t("guest.clear")}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full bg-sun-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-sun-600"
            >
              {t("guest.apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
