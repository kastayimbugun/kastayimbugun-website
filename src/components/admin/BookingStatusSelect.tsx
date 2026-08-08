"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateBookingStatus } from "@/lib/actions/admin/bookings";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import {
  bookingStatusLabel,
  lostReasonLabel,
  type BookingStatus,
  type LostReason,
} from "@/lib/schemas/adminBooking";
import { inputCls, btnSecondary } from "@/components/admin/ui/styles";

// Satış hattı sırası: teklif verilen talep "quoted"ta bekler, sonuç
// "confirmed" ya da "lost" olur.
const order: BookingStatus[] = [
  "new",
  "contacted",
  "quoted",
  "confirmed",
  "cancelled",
  "lost",
];

const tone: Record<BookingStatus, string> = {
  new: "bg-sun-50 text-sun-800 border-sun-200",
  contacted: "bg-sky-50 text-sky-800 border-sky-200",
  quoted: "bg-violet-50 text-violet-800 border-violet-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
  lost: "bg-sand-100 text-brand-900/70 border-sand-300",
};

/**
 * Durum değişiminin takvimde yan etkisi var, bu yüzden onay gerekir
 * (docs/panel-kurallari.md §3, "Yıkıcı işlemlerde onay"):
 *  - "Onaylandı" → villa takvimine blok yazılır, tarihler siteye kapanır.
 *  - Onaylıdan çıkış → blok silinir, tarihler siteye yeniden açılır.
 * Önceki sürümde bu düz bir açılır listeydi; yanlış tıklama doğrudan çift
 * rezervasyon riski demekti.
 */
function sideEffect(
  from: BookingStatus,
  to: BookingStatus
): { title: string; body: string; danger: boolean } | null {
  if (to === "confirmed") {
    return {
      title: "Talep onaylansın mı?",
      body: "Bu tarihler villa takviminde kapanacak ve sitede müsait görünmeyecek.",
      danger: false,
    };
  }
  if (from === "confirmed") {
    return {
      title:
        to === "cancelled" ? "Rezervasyon iptal edilsin mi?" : "Onay geri alınsın mı?",
      body: "Villa takvimindeki kayıt silinecek ve bu tarihler sitede yeniden müsait görünecek.",
      danger: true,
    };
  }
  return null;
}

export default function BookingStatusSelect({
  id,
  current,
}: {
  id: string;
  current: BookingStatus;
}) {
  const [value, setValue] = useState<BookingStatus>(current);
  const [pending, start] = useTransition();
  // "Kaybedildi" seçilince sebep sorulur; iptal edilirse durum değişmez.
  const [lostReason, setLostReason] = useState<LostReason | "">("");
  const [askingReason, setAskingReason] = useState(false);
  const toast = useToast();
  const confirm = useConfirm();

  const apply = (next: BookingStatus, reason?: LostReason) => {
    const prev = value;
    setValue(next); // iyimser
    start(async () => {
      const res = await updateBookingStatus({
        id,
        status: next,
        lostReason: reason,
      });
      if (res.ok) {
        toast.success(`Durum "${bookingStatusLabel[next]}" olarak kaydedildi.`);
      } else {
        setValue(prev); // geri al
        toast.error(
          res.error === "conflict"
            ? "Bu tarihler zaten dolu — takvimde çakışma var."
            : res.error === "auth"
              ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
              : "İşlem başarısız."
        );
      }
    });
  };

  const onChange = async (next: BookingStatus) => {
    if (next === value) return;

    const effect = sideEffect(value, next);
    if (effect) {
      const ok = await confirm({
        title: effect.title,
        body: effect.body,
        confirmLabel: effect.danger ? "Evet, devam et" : "Onayla",
        tone: effect.danger ? "danger" : "default",
      });
      // Onaylanmazsa kontrollü değer eski haliyle kalır.
      if (!ok) return;
    }

    // Sebep seçilmeden kaydedilmez: DB'de de aynı kısıt var (0006 migration).
    if (next === "lost") {
      setLostReason("");
      setAskingReason(true);
      return;
    }

    apply(next);
  };

  return (
    <>
      <div className="relative inline-flex items-center">
        <select
          value={value}
          disabled={pending}
          aria-label="Talep durumu"
          onChange={(e) => void onChange(e.target.value as BookingStatus)}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-60 ${tone[value]}`}
        >
          {order.map((s) => (
            <option key={s} value={s}>
              {bookingStatusLabel[s]}
            </option>
          ))}
        </select>
        {pending && (
          <Loader2 className="ml-1.5 h-3.5 w-3.5 animate-spin text-brand-600" />
        )}
      </div>

      {askingReason && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4"
          onClick={() => setAskingReason(false)}
          onKeyDown={(e) => e.key === "Escape" && setAskingReason(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="lost-reason-title"
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="lost-reason-title"
              className="text-base font-bold text-brand-950"
            >
              Talep neden kaybedildi?
            </h2>
            <p className="mt-1 text-sm text-brand-900/70">
              Sebep kaydedilir; birkaç ay sonra hangi fırsatların neden kaçtığı
              görülebilsin diye.
            </p>

            <select
              autoFocus
              value={lostReason}
              onChange={(e) => setLostReason(e.target.value as LostReason)}
              aria-label="Kayıp sebebi"
              className={`${inputCls} mt-3`}
            >
              <option value="">Seçin…</option>
              {(Object.keys(lostReasonLabel) as LostReason[]).map((r) => (
                <option key={r} value={r}>
                  {lostReasonLabel[r]}
                </option>
              ))}
            </select>

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setAskingReason(false)}
              >
                Vazgeç
              </button>
              <button
                type="button"
                disabled={!lostReason}
                onClick={() => {
                  setAskingReason(false);
                  apply("lost", lostReason as LostReason);
                }}
                className="inline-flex items-center justify-center rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
