"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteBooking } from "@/lib/actions/admin/bookings";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";

export default function DeleteBookingButton({
  bookingId,
  guestName,
  villaName,
  isConfirmed = false,
  redirectTo = "/yonetim/talepler",
}: {
  bookingId: string;
  guestName: string;
  villaName: string;
  isConfirmed?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const handleDelete = async () => {
    const ok = await confirm({
      title: isConfirmed ? "Rezervasyonu sil?" : "Talebi sil?",
      body: (
        <div className="space-y-1.5 text-sm text-brand-900/80">
          <p>
            <strong className="text-brand-950">{guestName}</strong> adına kayıtlı{" "}
            <strong className="text-brand-950">{villaName}</strong> kaydı kalıcı olarak silinecektir. Bu işlem geri alınamaz.
          </p>
          {isConfirmed && (
            <p className="text-xs font-semibold text-rose-700">
              Dikkat: Bu onaylı bir rezervasyondur. Silindiğinde villa takvimindeki blok kaldırılacak ve tarihler yeniden açılacaktır.
            </p>
          )}
        </div>
      ),
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });

    if (!ok) return;

    start(async () => {
      const res = await deleteBooking({ id: bookingId });
      if (res.ok) {
        toast.success(isConfirmed ? "Rezervasyon silindi." : "Talep silindi.");
        router.push(redirectTo);
        router.refresh();
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "Silme işlemi başarısız oldu."
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 hover:text-rose-800 focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      {isConfirmed ? "Rezervasyonu sil" : "Talebi sil"}
    </button>
  );
}
