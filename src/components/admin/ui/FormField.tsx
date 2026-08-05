import { labelCls, hintCls, errorCls } from "./styles";

/**
 * Form alanı sarmalayıcısı — etiket + zorunluluk işareti + yardım metni +
 * alan altı hata (docs/panel-kurallari.md §4: "hata mesajları alan altında
 * satır içi").
 *
 * `<label>` sarmalayıcı olduğu için etiket-alan bağı örtük kurulur; ayrıca
 * id/htmlFor eşlemesi gerekmez.
 */
export function Field({
  label,
  children,
  hint,
  error,
  required,
  className,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className={labelCls}>
        {label}
        {required && (
          <span className="text-rose-600" title="Zorunlu alan">
            {" *"}
          </span>
        )}
      </span>
      {children}
      {error ? (
        <span className={errorCls}>{error}</span>
      ) : hint ? (
        <span className={hintCls}>{hint}</span>
      ) : null}
    </label>
  );
}

/** Form bölümü kartı. */
export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="text-base font-bold text-brand-950">{title}</h2>
      {description && (
        <p className="mt-0.5 text-xs text-brand-900/70">{description}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}
