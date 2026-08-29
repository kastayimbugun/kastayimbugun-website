"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, CalendarCheck, Loader2, Lock } from "lucide-react";
import { addBlock, removeBlock } from "@/lib/actions/admin/villas";
import { bulkSetAvailability } from "@/lib/actions/admin/bulk";
import { cancelReservation } from "@/lib/actions/admin/bookings";
import { formatDateShort } from "@/lib/format";
import { rangeHasConflict } from "@/lib/availability";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { labelCls } from "@/components/admin/ui/styles";
import type { AdminBlock, AdminSeason } from "@/lib/data/admin/villas";

/** yyyy-mm-dd + 1 gün (blok bitişi yarı-açık: son gece + 1). */
function addDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

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

  // Onaylı rezervasyonlar takvimde kilitli "Dolu"; elle kapatmalar ayrı
  // (mavi, tıkla-aç). İkisi de aynı villa_blocks kaydından geliyor — multi
  // takvimle senkron, çünkü orası da aynı tabloya yazıyor.
  const bookedRanges = blocks
    .filter((b) => b.source === "booking")
    .map((b) => ({ start: b.startsOn, end: b.endsOn }));
  const closedRanges = blocks
    .filter((b) => b.source !== "booking")
    .map((b) => ({ start: b.startsOn, end: b.endsOn }));
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

  /**
   * Seçim mantığı multi-calendar (Takvim ekranı) ile aynı: ilk tık giriş
   * gününü koyar, aynı satırda ikinci tık aralığı tamamlar. Elle kapalı günler
   * de seçilebilir (toplu açmak için); yalnızca onaylı rezervasyonlar bloklar.
   */
  const onDayClick = (iso: string) => {
    // Yeni seçim ya da tamamlanmış aralıktan sonra → tek günlük seçim başlat.
    if (!checkIn || (checkOut && checkOut !== checkIn)) {
      setCheckIn(iso);
      setCheckOut(iso);
      return;
    }
    if (iso < checkIn) {
      setCheckIn(iso);
      setCheckOut(iso);
      return;
    }
    // Seçim onaylı bir rezervasyonun üstünden geçemez.
    if (rangeHasConflict(checkIn, addDay(iso), bookedRanges)) {
      setCheckIn(iso);
      setCheckOut(iso);
      return;
    }
    setCheckOut(iso);
  };

  // Seçili aralık (checkIn..checkOut, gece olarak dahil) — kapatılabilir mi
  // (tamamı boş) yoksa açılabilir mi (elle kapalı gün içeriyor)?
  const endExclusive = checkOut ? addDay(checkOut) : null;
  const selManualBlocks =
    checkIn && endExclusive
      ? blocks.filter(
          (b) =>
            b.source !== "booking" &&
            b.startsOn < endExclusive &&
            b.endsOn > checkIn
        )
      : [];
  const selMode: "open" | "close" =
    selManualBlocks.length > 0 ? "open" : "close";

  const close = () => {
    if (!checkIn || !endExclusive) return;
    start(async () => {
      const res = await addBlock({
        villaId,
        startsOn: checkIn,
        endsOn: endExclusive,
        note,
      });
      if (res.ok) {
        toast.success(
          `${formatDateShort(checkIn)} – ${formatDateShort(
            checkOut!
          )} kapatıldı.`
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

  /**
   * Seçili aralığı açar.
   *
   * Blokları TAMAMEN silmek yerine seçimle kesişen kısmı çıkarır: aralığın
   * dışına taşan parçalar korunur (bkz. `open_villa_dates`). Eskiden 5–6 Ağustos'u
   * açmak, o günlere değen 4 aylık bir tahsis bloğunun tamamını açıyordu.
   */
  const openSelected = () => {
    if (selManualBlocks.length === 0 || !checkIn || !endExclusive) return;
    start(async () => {
      const res = await bulkSetAvailability({
        villaIds: [villaId],
        from: checkIn,
        to: endExclusive,
        mode: "open",
      });
      if (!res.ok) {
        toast.error("Tarihler açılamadı.");
        router.refresh();
        return;
      }
      toast.success("Seçili tarihler yeniden müsait.");
      setCheckIn(null);
      setCheckOut(null);
      router.refresh();
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
      {/* Görsel takvim — sitedeki ile aynı bileşen; panelde elle kapatmalar
          tıkla-aç, rezervasyonlar kilitli. */}
      <AvailabilityCalendar
        bookedRanges={bookedRanges}
        closedRanges={closedRanges}
        seasons={seasonRows}
        checkIn={checkIn}
        checkOut={checkOut}
        onDayClick={onDayClick}
        getBookedNote={noteForDay}
      />

      {/* Seçim + eylem çubuğu — seçim boşsa "Kapat", elle kapalı gün
          içeriyorsa "Aç" (birden çok kapatma tek seferde açılır). */}
      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-sand-200 bg-sand-50 p-3 sm:flex-row sm:items-end">
        <div className="text-sm sm:pb-2">
          {checkIn && checkOut ? (
            <span className="font-semibold text-brand-950">
              {formatDateShort(checkIn)} – {formatDateShort(checkOut)}
              <span className="ml-1 font-normal text-brand-900/70">
                {selMode === "open" ? "açılacak" : "kapatılacak"}
              </span>
            </span>
          ) : (
            <span className="text-brand-900/70">
              Takvimden bir aralık seçin: boş günleri kapatın ya da kapalı
              günleri seçip açın.
            </span>
          )}
        </div>

        {selMode === "close" && (
          <label className="block sm:ml-auto sm:w-56">
            <span className={labelCls}>Kapatma notu</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ör. X Turizm"
              className="w-full rounded-lg border border-sand-200 bg-white px-2.5 py-2 text-sm text-brand-950 outline-none transition placeholder:text-brand-900/45 focus:border-brand-500 focus:ring-2 focus:ring-brand-300"
            />
          </label>
        )}

        {selMode === "open" ? (
          <button
            type="button"
            onClick={openSelected}
            disabled={pending}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-auto"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarCheck className="h-4 w-4" />
            )}
            Seçili tarihleri aç
          </button>
        ) : (
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
        )}
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
