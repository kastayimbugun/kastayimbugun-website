/**
 * Durum rozeti — tek kaynak (docs/panel-kurallari.md §4: "net durum rozetleri").
 * Villa durumu iki ayrı sayfada kopya `statusMeta` nesnesiyle çiziliyordu.
 */

export type BadgeTone =
  | "success"
  | "warning"
  | "info"
  | "danger"
  | "neutral";

const toneCls: Record<BadgeTone, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  warning: "bg-sun-50 text-sun-800 ring-sun-200",
  info: "bg-sky-50 text-sky-800 ring-sky-200",
  danger: "bg-rose-50 text-rose-800 ring-rose-200",
  neutral: "bg-sand-100 text-brand-900/70 ring-sand-200",
};

export default function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset ${toneCls[tone]} ${className ?? ""}`}
    >
      {children}
    </span>
  );
}
