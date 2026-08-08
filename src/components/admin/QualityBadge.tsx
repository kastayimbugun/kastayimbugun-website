import type { VillaQuality } from "@/lib/villaQuality";

const toneCls: Record<VillaQuality["tone"], string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-sun-50 text-sun-800 ring-sun-200",
  danger: "bg-rose-50 text-rose-800 ring-rose-200",
};

/**
 * Villa içerik kalite skoru rozeti (yol haritası 4.1). Listede kompakt yüzde;
 * eksik sayısını `title` ile ipucu olarak gösterir.
 */
export default function QualityBadge({
  quality,
  showMissing = false,
}: {
  quality: VillaQuality;
  /** true ise yüzdenin yanına "N eksik" yazar. */
  showMissing?: boolean;
}) {
  const missingCount = quality.missing.length;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ring-1 ${toneCls[quality.tone]}`}
      title={
        missingCount > 0
          ? "Eksik: " + quality.missing.map((m) => m.label).join(", ")
          : "İçerik tam"
      }
    >
      %{quality.score}
      {showMissing && missingCount > 0 && (
        <span className="font-medium opacity-80">· {missingCount} eksik</span>
      )}
    </span>
  );
}
