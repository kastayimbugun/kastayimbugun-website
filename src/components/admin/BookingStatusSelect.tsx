"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { updateBookingStatus } from "@/lib/actions/admin/bookings";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import {
  bookingStatusLabel,
  type BookingStatus,
} from "@/lib/schemas/adminBooking";

const order: BookingStatus[] = ["new", "contacted", "confirmed", "cancelled"];

const tone: Record<BookingStatus, string> = {
  new: "bg-sun-50 text-sun-800 border-sun-200",
  contacted: "bg-sky-50 text-sky-800 border-sky-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  cancelled: "bg-rose-50 text-rose-800 border-rose-200",
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
  const toast = useToast();
  const confirm = useConfirm();

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

    const prev = value;
    setValue(next); // iyimser
    start(async () => {
      const res = await updateBookingStatus({ id, status: next });
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

  return (
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
  );
}
