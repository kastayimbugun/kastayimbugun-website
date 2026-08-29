"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight, CalendarX, Loader2, Phone } from "lucide-react";
import { addBlock } from "@/lib/actions/admin/villas";
import { bulkSetAvailability } from "@/lib/actions/admin/bulk";
import { formatDateShort, formatPrice } from "@/lib/format";
import { useToast } from "@/components/admin/ui/Toast";
import { inputCls } from "@/components/admin/ui/styles";
import type { CalendarVilla, BlockBooking } from "@/lib/data/admin/calendar";

/**
 * Çoklu takvim ızgarası: satırlar = villalar, sütunlar = günler.
 *
 * Bir gece "dolu"dur eğer o günü kapsayan blok varsa (startsOn ≤ gün < endsOn).
 * İki dolu aralık arasında kalan ≤3 gecelik boşluklar "gap night" olarak
 * vurgulanır — telefonla satışın en kârlı hedefi (yol haritası 3.2).
 *
 * Seçim tek villa satırında yapılır: bir güne tıkla (giriş), sonra aynı satırda
 * başka bir güne tıkla (çıkış). Seçili aralık boşsa "kapat", tamamen elle
 * kapalıysa "aç" çubuğu çıkar.
 */

const DAY_W = 34; // px — bir gün sütununun genişliği
const NAME_W = 180; // px — villa adı sütunu

type Selection = { villaId: string; start: string; end: string } | null;

function isoAddDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Bir villanın gece durumlarını hesaplar: dolu/boş + gap işareti. */
function villaState(villa: CalendarVilla, days: string[]) {
  // Her gün için o günü kapsayan blok (varsa).
  const blockOf = new Map<string, CalendarVilla["blocks"][number]>();
  for (const day of days) {
    const b = villa.blocks.find((x) => day >= x.startsOn && day < x.endsOn);
    if (b) blockOf.set(day, b);
  }

  // Gap night: bir önceki ve bir sonraki gece dolu olan ≤3 gecelik boş koşu.
  const gap = new Set<string>();
  let i = 0;
  while (i < days.length) {
    if (blockOf.has(days[i])) {
      i++;
      continue;
    }
    let j = i;
    while (j < days.length && !blockOf.has(days[j])) j++;
    const runLen = j - i;
    // Koşunun iki yanı da pencere içinde ve dolu mu?
    const prevDay = isoAddDays(days[i], -1);
    const nextDay = days[j]; // koşudan sonraki ilk gün
    const prevOccupied = villa.blocks.some(
      (x) => prevDay >= x.startsOn && prevDay < x.endsOn
    );
    const nextOccupied =
      j < days.length && villa.blocks.some((x) => nextDay >= x.startsOn && nextDay < x.endsOn);
    if (runLen <= 3 && prevOccupied && nextOccupied) {
      for (let k = i; k < j; k++) gap.add(days[k]);
    }
    i = j;
  }

  return { blockOf, gap };
}

export default function MultiCalendar({
  from,
  days,
  villas,
  weeks,
}: {
  from: string;
  days: string[];
  villas: CalendarVilla[];
  weeks: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [sel, setSel] = useState<Selection>(null);
  const [note, setNote] = useState("");
  // Dolu hücrenin üstüne gelince gösterilen rezervasyon önizlemesi.
  const [preview, setPreview] = useState<{
    booking: BlockBooking;
    x: number;
    y: number;
  } | null>(null);

  const states = useMemo(
    () => new Map(villas.map((v) => [v.id, villaState(v, days)])),
    [villas, days]
  );

  const gapTotal = useMemo(() => {
    let n = 0;
    for (const v of villas) n += states.get(v.id)!.gap.size;
    return n;
  }, [villas, states]);

  const shift = (deltaWeeks: number) => {
    const next = isoAddDays(from, deltaWeeks * 7);
    router.push(`/yonetim/takvim?baslangic=${next}`);
  };

  const onCellClick = (villaId: string, day: string) => {
    // Yeni seçim ya da farklı villa → giriş gününü ata.
    if (!sel || sel.villaId !== villaId || sel.end !== sel.start) {
      setSel({ villaId, start: day, end: day });
      return;
    }
    // Aynı satırda ikinci tık → aralığı belirle (çıkış hariç mantığı: bitiş
    // seçilen günün ertesi, tek gece kapatmak için de çalışsın).
    if (day < sel.start) {
      setSel({ villaId, start: day, end: day });
      return;
    }
    setSel({ ...sel, end: day });
  };

  // Seçili aralığın durumu: kapatılabilir mi (boş) / açılabilir mi (elle kapalı).
  const selInfo = useMemo(() => {
    if (!sel) return null;
    const st = states.get(sel.villaId);
    if (!st) return null;
    const range: string[] = [];
    for (let d = sel.start; d <= sel.end; d = isoAddDays(d, 1)) range.push(d);

    const hasBooking = range.some(
      (d) => st.blockOf.get(d)?.source === "booking"
    );
    const allManual =
      range.length > 0 &&
      range.every((d) => st.blockOf.get(d)?.source === "manual");
    const anyFree = range.some((d) => !st.blockOf.has(d));
    // Kapatma "yarı açık" aralık ister: giriş..çıkış+1
    const endExclusive = isoAddDays(sel.end, 1);
    return { range, hasBooking, allManual, anyFree, endExclusive };
  }, [sel, states]);

  const closeRange = () => {
    if (!sel || !selInfo) return;
    start(async () => {
      const res = await addBlock({
        villaId: sel.villaId,
        startsOn: sel.start,
        endsOn: selInfo.endExclusive,
        note,
      });
      if (res.ok) {
        toast.success("Tarihler kapatıldı.");
        setSel(null);
        setNote("");
        router.refresh();
      } else {
        toast.error(
          res.error === "conflict"
            ? "Seçili aralıkta dolu/kapalı gün var."
            : "Kapatılamadı."
        );
      }
    });
  };

  const openRange = () => {
    if (!sel || !selInfo) return;
    // Seçimle kesişen elle blokları silmek yerine BÖL: aralığın dışına taşan
    // parçalar korunur (bkz. `open_villa_dates`). Eskiden birkaç günü açmak,
    // o günlere değen aylık bir tahsis bloğunun tamamını açabiliyordu.
    start(async () => {
      const res = await bulkSetAvailability({
        villaIds: [sel.villaId],
        from: sel.start,
        to: selInfo.endExclusive,
        mode: "open",
      });

      setSel(null);
      router.refresh();

      if (res.ok) toast.success("Seçili tarihler yeniden müsait.");
      else toast.error("Tarihler açılamadı. Tekrar deneyin.");
    });
  };

  // Ay etiketleri için gün başına ay adı değişimini bul.
  const monthLabel = (iso: string) =>
    new Date(iso + "T00:00:00Z").toLocaleDateString("tr-TR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

  return (
    <div>
      {/* Üst çubuk: gezinme + gap özeti */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shift(-weeks)}
            className="inline-flex items-center gap-1 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-sand-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Önceki
          </button>
          <button
            type="button"
            onClick={() => shift(weeks)}
            className="inline-flex items-center gap-1 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand-800 transition hover:bg-sand-50"
          >
            Sonraki
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="ml-2 text-sm font-semibold text-brand-950">
            {monthLabel(days[0])}
            {monthLabel(days[0]) !== monthLabel(days[days.length - 1]) &&
              ` – ${monthLabel(days[days.length - 1])}`}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-rose-300" /> Dolu
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-brand-300" /> Kapalı
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-amber-300 ring-1 ring-amber-500" />{" "}
            Boş delik ({gapTotal})
          </span>
        </div>
      </div>

      {/* Izgara */}
      <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white">
        <div style={{ width: NAME_W + days.length * DAY_W }}>
          {/* Gün başlıkları */}
          <div className="flex border-b border-sand-200 bg-sand-50">
            <div
              className="shrink-0 px-3 py-2 text-xs font-bold text-brand-900/70"
              style={{ width: NAME_W }}
            >
              Villa
            </div>
            {days.map((d) => {
              const date = new Date(d + "T00:00:00Z");
              const dow = date.getUTCDay(); // 0=Paz, 6=Cmt
              const weekend = dow === 0 || dow === 6;
              return (
                <div
                  key={d}
                  className={`shrink-0 border-l border-sand-100 py-1 text-center text-[10px] leading-tight ${
                    weekend ? "bg-sand-100 font-bold text-brand-900" : "text-brand-900/60"
                  }`}
                  style={{ width: DAY_W }}
                >
                  <div>{date.getUTCDate()}</div>
                  <div>{["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"][dow]}</div>
                </div>
              );
            })}
          </div>

          {/* Villa satırları */}
          {villas.map((v) => {
            const st = states.get(v.id)!;
            return (
              <div key={v.id} className="flex border-b border-sand-100 last:border-0">
                <Link
                  href={`/yonetim/villalar/${v.id}`}
                  className="shrink-0 truncate px-3 py-2 text-sm font-semibold text-brand-900 hover:text-brand-700 hover:underline"
                  style={{ width: NAME_W }}
                  title={v.name}
                >
                  {v.name}
                  {v.status === "draft" && (
                    <span className="ml-1 text-[10px] font-bold text-sun-700">
                      TASLAK
                    </span>
                  )}
                </Link>
                {days.map((d) => {
                  const b = st.blockOf.get(d);
                  const isGap = st.gap.has(d);
                  const selected =
                    sel?.villaId === v.id && d >= sel.start && d <= sel.end;

                  const booking = b?.booking ?? null;
                  let bg = "bg-white hover:bg-brand-50";
                  if (b?.source === "booking") bg = "bg-rose-300 hover:bg-rose-400";
                  else if (b) bg = "bg-brand-300";
                  else if (isGap) bg = "bg-amber-300 ring-1 ring-inset ring-amber-500";

                  // Dolu (rezervasyon) hücre: üstüne gelince önizleme, tıkla →
                  // o rezervasyonun detayına git.
                  if (booking) {
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          router.push(`/yonetim/talepler/${booking.id}`)
                        }
                        onMouseEnter={(e) => {
                          const r = e.currentTarget.getBoundingClientRect();
                          setPreview({ booking, x: r.left, y: r.bottom });
                        }}
                        onMouseLeave={() => setPreview(null)}
                        aria-label={`${booking.guestName} rezervasyonu — detaya git`}
                        className={`h-9 shrink-0 cursor-pointer border-l border-sand-100 transition ${bg}`}
                        style={{ width: DAY_W }}
                      />
                    );
                  }

                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => onCellClick(v.id, d)}
                      title={
                        b
                          ? b.note || "Elle kapatıldı"
                          : isGap
                            ? "Boş delik — satışa uygun"
                            : "Müsait"
                      }
                      className={`h-9 shrink-0 border-l border-sand-100 transition ${bg} ${
                        selected ? "ring-2 ring-inset ring-brand-600" : ""
                      }`}
                      style={{ width: DAY_W }}
                    />
                  );
                })}
              </div>
            );
          })}

          {villas.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-brand-900/70">
              Gösterilecek villa yok.
            </div>
          )}
        </div>
      </div>

      {/* Rezervasyon önizlemesi — dolu hücrenin üstüne gelince */}
      {preview && (
        <div
          className="pointer-events-none fixed z-50 w-56 rounded-xl border border-sand-200 bg-white p-3 shadow-lg"
          style={{
            left: Math.min(preview.x, (typeof window !== "undefined" ? window.innerWidth : 9999) - 240),
            top: preview.y + 6,
          }}
        >
          <div className="text-sm font-bold text-brand-950">
            {preview.booking.guestName}
          </div>
          <div className="mt-0.5 text-xs text-brand-900/70">
            {formatDateShort(preview.booking.checkIn)} –{" "}
            {formatDateShort(preview.booking.checkOut)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-xs text-brand-900/70">
            <Phone className="h-3 w-3" />
            {preview.booking.phone}
          </div>
          {preview.booking.priceEstimate != null && (
            <div className="mt-1 text-xs">
              <span className="font-semibold text-brand-950">
                {formatPrice(preview.booking.priceEstimate)}
              </span>
              {preview.booking.paidAmount > 0 && (
                <span className="text-brand-900/60">
                  {" "}
                  · ödenen {formatPrice(preview.booking.paidAmount)}
                </span>
              )}
            </div>
          )}
          <div className="mt-1.5 text-[11px] font-semibold text-brand-600">
            Detay için tıklayın →
          </div>
        </div>
      )}

      {/* Seçim eylem çubuğu */}
      {sel && selInfo && (
        <div className="mt-3 flex flex-col gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3 sm:flex-row sm:items-end">
          <div className="text-sm sm:pb-2">
            <span className="font-semibold text-brand-950">
              {villas.find((v) => v.id === sel.villaId)?.name}
            </span>
            <span className="ml-1 text-brand-900/70">
              · {formatDateShort(sel.start)} – {formatDateShort(sel.end)}
            </span>
          </div>

          {selInfo.hasBooking ? (
            <p className="text-sm text-rose-700 sm:ml-auto sm:pb-2">
              Seçimde onaylı rezervasyon var — buradan değiştirilemez.
            </p>
          ) : selInfo.allManual ? (
            <div className="flex gap-2 sm:ml-auto">
              <button
                type="button"
                onClick={() => setSel(null)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-white"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={openRange}
                disabled={pending}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Tarihleri aç
              </button>
            </div>
          ) : (
            <>
              <label className="block sm:ml-auto sm:w-48">
                <span className="mb-1 block text-xs font-semibold text-brand-900/70">
                  Kapatma notu
                </span>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ör. X Turizm"
                  className={inputCls}
                />
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSel(null)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-brand-800 hover:bg-white"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={closeRange}
                  disabled={pending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-800 disabled:opacity-50"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarX className="h-4 w-4" />
                  )}
                  Kapat
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
