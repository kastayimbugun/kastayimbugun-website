"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { btnPrimary } from "@/components/admin/ui/styles";

/**
 * Panel hata sınırı. Veri katmanı hata fırlattığında (ör. oturum düştü,
 * RLS reddetti) Next'in çıplak hata sayfası yerine bu görünür.
 *
 * Ayrıntılı hata yalnızca sunucu logunda kalır; kullanıcıya genel mesaj
 * gösterilir (docs/panel-kurallari.md §2).
 */
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-sand-200 bg-white px-6 py-10 text-center">
      <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50">
        <AlertTriangle className="h-5 w-5 text-rose-600" />
      </span>
      <h1 className="font-bold text-brand-950">Bu ekran yüklenemedi</h1>
      <p className="mt-1.5 text-sm text-brand-900/70">
        Bağlantı veya oturum kaynaklı geçici bir sorun olabilir. Tekrar deneyin;
        sürerse çıkış yapıp yeniden giriş yapın.
      </p>
      {error.digest && (
        <p className="mt-2 text-[11px] text-brand-900/50">
          Hata kodu: {error.digest}
        </p>
      )}
      <button onClick={reset} className={`${btnPrimary} mt-5`}>
        <RotateCw className="h-4 w-4" />
        Tekrar dene
      </button>
    </div>
  );
}
