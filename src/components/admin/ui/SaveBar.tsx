"use client";

import { Save, Loader2 } from "lucide-react";
import { btnPrimary } from "./styles";

/**
 * Yapışkan kaydet çubuğu — VillaForm ve CategoryForm'da 18 satır birebir
 * kopyaydı (docs/panel-kurallari.md §5).
 *
 * Buton `type="submit"`; sarmalayan `<form>` gönderimi tetikler. Böylece bir
 * metin alanındayken Enter'a basmak da kaydeder (önceki sürümde form elemanı
 * kullanılmadığı için Enter hiçbir şey yapmıyordu).
 *
 * Başarı mesajı artık burada değil toast'ta gösterilir — çubuktaki "Kaydedildi."
 * yazısı kullanıcı yeni değişiklik yaptıktan sonra da ekranda kalıyordu.
 */
export default function SaveBar({
  pending,
  dirty,
  label,
  children,
}: {
  pending: boolean;
  dirty?: boolean;
  label: string;
  /** Sol tarafa ek içerik (ör. ikincil eylem veya durum notu). */
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-sand-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
      <div className="min-w-0 text-sm">
        {children ??
          (dirty ? (
            <span className="font-semibold text-sun-700">
              Kaydedilmemiş değişiklik var
            </span>
          ) : null)}
      </div>
      <button type="submit" disabled={pending} className={`${btnPrimary} px-6`}>
        {pending ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <Save className="h-5 w-5" />
        )}
        {label}
      </button>
    </div>
  );
}
