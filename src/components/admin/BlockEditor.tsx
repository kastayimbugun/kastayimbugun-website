"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Loader2, Lock } from "lucide-react";
import { addBlock, removeBlock } from "@/lib/actions/admin/villas";
import { cancelReservation } from "@/lib/actions/admin/bookings";
import { formatDateShort } from "@/lib/format";
import { rangeHasConflict } from "@/lib/availability";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { labelCls } from "@/components/admin/ui/styles";
import type { AdminBlock, AdminSeason } from "@/lib/data/admin/villas";

export default function BlockEditor({
  villaId,
  blocks,
  seasons,
}: {
  villaId: string;
  blocks: AdminBlock[];
  seasons: AdminSeason[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  // Kapalı/dolu tarihler takvimde "Dolu" olarak görünür
  const bookedRanges = blocks.map((b) => ({
    start: b.startsOn,
    end: b.endsOn,
  }));
  const seasonRows = seasons.map((s) => ({
    start: s.startsOn,
    end: s.endsOn,
    price: s.price,
  }));

  // Dolu günün üstüne gelince: kime kapatıldığı / rezervasyon bilgisi (yalnızca panelde)
  const noteForDay = (iso: string): string | null => {
    const b = blocks.find((x) => iso >= x.startsOn && iso < x.endsOn);
    if (!b) return null;
    if (b.source === "booking") return "Onaylı rezervasyon";
    return b.note ? `Kapalı — ${b.note}` : "Elle kapatıldı";
  };

  // Sitedeki aralık seçim mantığının aynısı
  const onDayClick = (iso: string) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }
    if (iso <= checkIn) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }
    if (rangeHasConflict(checkIn, iso, bookedRanges)) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }
    setCheckOut(iso);
  };

  const close = () => {
    if (!checkIn || !checkOut) return;
    start(async () => {
      const res = await addBlock({
        villaId,
        startsOn: checkIn,
        endsOn: checkOut,
        note,
      });
      if (res.ok) {
        toast.success(
          `${formatDateShort(checkIn)} – ${formatDateShort(checkOut)} kapatıldı.`
        );
        setCheckIn(null);
        setCheckOut(null);
        setNote("");
        router.refresh();
      } else {
        toast.error(
          res.error === "conflict"
            ? "Bu tarihler zaten kapalı/dolu."
            : res.error === "validation"
              ? "Geçerli bir aralık seçin."
              : res.error === "auth"
                ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
                : "Kapatılamadı."
        );
      }
    });
  };

  const open = (b: AdminBlock) => {
    start(async () => {
      const res = await removeBlock({ id: b.id, villaId });
      if (res.ok) {
        toast.success("Tarihler yeniden müsait.");
        router.refresh();
      } else {
        toast.error("Açılamadı.");
      }
    });
  };

  const cancelBooking = async (b: AdminBlock) => {
    const ok = await confirm({
      title: "Rezervasyon iptal edilsin mi?",
      body: `${formatDateShort(b.startsOn)} – ${formatDateShort(
        b.endsOn
      )} tarihleri sitede yeniden müsait görünecek ve ilgili talep "İptal" durumuna geçecek.`,
      confirmLabel: "İptal et",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!ok) return;

    start(async () => {
      const res = await cancelReservation({
        villaId,
        startsOn: b.startsOn,
        endsOn: b.endsOn,
      });
      if (res.ok) {
        toast.success("Rezervasyon iptal edildi, tarihler açıldı.");
        router.refresh();
      } else {
        toast.error("İptal edilemedi.");
      }
    });
  };

  return (
    <div>
      {/* Görsel takvim — sitedeki ile aynı */}
      <AvailabilityCalendar
        bookedRanges={bookedRanges}
        seasons={seasonRows}
        checkIn={checkIn}
        checkOut={checkOut}
        onDayClick={onDayClick}
        getBookedNote={noteForDay}
      />

      {/* Seçim + kapat çubuğu */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3 sm:flex-row sm:items-end">
        <div className="text-sm sm:pb-2">
          {checkIn && checkOut ? (
            <span className="font-semibold text-brand-950">
              {formatDateShort(checkIn)} – {formatDateShort(checkOut)}
              <span className="ml-1 font-normal text-brand-900/70">
                kapatılacak
              </span>
            </span>
          ) : checkIn ? (
            <span className="text-brand-900/70">
              Bitiş tarihini seçin ({formatDateShort(checkIn)} →)
            </span>
          ) : (
            <span className="text-brand-900/70">
              Takvimden kapatılacak aralığı seçin.
            </span>
          )}
        </div>

        <label className="block sm:ml-auto sm:w-56">
          <span className={labelCls}>Kapatma notu</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ör. X Turizm"
            className="w-full rounded-lg border border-sand-200 bg-white px-2.5 py-2 text-sm text-brand-950 outline-none transition placeholder:text-brand-900/45 focus:border-brand-500 focus:ring-2 focus:ring-brand-300"
          />
        </label>

        <button
          type="button"
          onClick={close}
          disabled={pending || !checkIn || !checkOut}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-brand-900/50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarX className="h-4 w-4" />
          )}
          Seçili tarihleri kapat
        </button>
      </div>

      {/* Kapalı tarihler listesi */}
      <div className="mt-5">
        <h3 className="mb-2 text-sm font-bold text-brand-950">
          Kapalı Tarihler
        </h3>
        {blocks.length === 0 ? (
          <p className="text-sm text-brand-900/70">
            Kapalı tarih yok — villa tüm günlerde müsait görünüyor.
          </p>
        ) : (
          <ul className="divide-y divide-sand-100">
            {blocks.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <div>
                  <div className="font-semibold text-brand-900">
                    {formatDateShort(b.startsOn)} – {formatDateShort(b.endsOn)}
                  </div>
                  <div className="text-xs text-brand-900/70">
                    {b.source === "booking"
                      ? "Onaylı rezervasyon"
                      : b.note || "Elle kapatıldı"}
                  </div>
                </div>
                {b.source === "booking" ? (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand-900/70">
                      <Lock className="h-3.5 w-3.5" />
                      Rezervasyon
                    </span>
                    <button
                      type="button"
                      onClick={() => void cancelBooking(b)}
                      disabled={pending}
                      className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-300 disabled:opacity-50"
                    >
                      İptal et
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => open(b)}
                    disabled={pending}
                    className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:opacity-50"
                  >
                    Aç
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
