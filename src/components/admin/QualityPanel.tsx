import { Check, X } from "lucide-react";
import type { VillaQuality } from "@/lib/villaQuality";

const barTone: Record<VillaQuality["tone"], string> = {
  success: "bg-emerald-500",
  warning: "bg-sun-500",
  danger: "bg-rose-500",
};

/**
 * Villa detayında içerik kalite skoru + madde madde durum (yol haritası 4.1).
 * Amaç: kullanıcıya "bu villayı yayınlamadan önce şunlar eksik" demek.
 */
export default function QualityPanel({ quality }: { quality: VillaQuality }) {
  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold text-brand-950">İçerik kalitesi</h2>
        <span className="text-lg font-extrabold text-brand-950">
          %{quality.score}
        </span>
      </div>

      <div className="mt-2 h-2 overflow-hidden rounded-full bg-sand-100">
        <div
          className={`h-full rounded-full transition-all ${barTone[quality.tone]}`}
          style={{ width: `${quality.score}%` }}
        />
      </div>

      {quality.missing.length > 0 ? (
        <p className="mt-3 text-sm text-brand-900/70">
          Yayına en uygun hale getirmek için eksikler:
        </p>
      ) : (
        <p className="mt-3 text-sm font-semibold text-emerald-700">
          İçerik tam — bu villa yayına hazır. 🎉
        </p>
      )}

      <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {quality.items.map((it) => (
          <li
            key={it.key}
            className={`flex items-center gap-2 text-sm ${
              it.done ? "text-brand-900/60" : "font-semibold text-brand-950"
            }`}
          >
            {it.done ? (
              <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <X className="h-4 w-4 shrink-0 text-rose-500" />
            )}
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
