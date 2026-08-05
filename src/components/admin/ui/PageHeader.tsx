import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Sayfa başlığı kalıbı — 10 panel sayfasında birebir tekrar ediyordu.
 * (docs/panel-kurallari.md §5, "DRY / tasarım sistemi".)
 */
export function PageHeader({
  title,
  description,
  actions,
  badge,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-xl font-extrabold text-brand-950">{title}</h1>
          {badge}
        </div>
        {description && (
          <p className="mt-1 text-sm text-brand-900/70">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 gap-2">{actions}</div>}
    </div>
  );
}

/** Üst sayfaya dönüş bağlantısı — 4 sayfada tekrar ediyordu. */
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-brand-700 transition hover:text-brand-800 hover:underline focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      <ArrowLeft className="h-4 w-4" />
      {children}
    </Link>
  );
}

/**
 * Boş liste durumu. Yalnızca gri metin değil — eylem çağrısı alabilir,
 * böylece kullanıcı ne yapacağını ekranda görür.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-sand-300 bg-white px-6 py-10 text-center">
      {Icon && (
        <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sand-100">
          <Icon className="h-5 w-5 text-brand-700" />
        </span>
      )}
      <p className="font-semibold text-brand-900">{title}</p>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-sm text-brand-900/70">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
