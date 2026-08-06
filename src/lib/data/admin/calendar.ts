import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import type { VillaStatus } from "./villas";

/**
 * Çoklu takvim (multi-calendar) verisi — tüm villaların doluluğu tek ekranda
 * (docs/panel-yol-haritasi.md, Dalga 3.2).
 *
 * Asıl kazanç: iki rezervasyon arasında boş kalan 2–3 gecelik "delikleri"
 * (gap nights) görmek. Bunlar telefonla satışta en kârlı hedeftir; delik
 * hesabı istemcide, hücre durumlarından çıkarılıyor.
 */

/** Bir booking bloğuna eşleşen onaylı talebin özeti (önizleme + detay linki). */
export interface BlockBooking {
  id: string;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  priceEstimate: number | null;
  paidAmount: number;
}

export interface CalendarBlock {
  id: string;
  startsOn: string;
  endsOn: string;
  source: "manual" | "booking" | "ical";
  note: string | null;
  /** source === "booking" ise eşleşen onaylı talep (villa + tarih ile). */
  booking: BlockBooking | null;
}

export interface CalendarVilla {
  id: string;
  name: string;
  status: VillaStatus;
  blocks: CalendarBlock[];
}

/** yyyy-mm-dd, yerel değil UTC güne göre (takvim gün mantığı saat dilimsiz). */
function isoAddDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export interface MultiCalendar {
  /** Pencere başlangıcı (dahil). */
  from: string;
  /** Pencere bitişi (hariç) — son günün ertesi. */
  to: string;
  days: string[];
  villas: CalendarVilla[];
}

/**
 * `from` gününden başlayarak `dayCount` günlük pencere için tüm villaların
 * (arşiv hariç) blokları. Yalnızca pencereye değen bloklar çekilir:
 * `starts_on < to AND ends_on > from`.
 */
export async function getMultiCalendar(
  from: string,
  dayCount: number
): Promise<MultiCalendar> {
  const supabase = await supabaseSession();
  const to = isoAddDays(from, dayCount);

  const days = Array.from({ length: dayCount }, (_, i) => isoAddDays(from, i));

  const { data: villaRows, error: villaErr } = await supabase
    .from("villas")
    .select("id, name, status")
    .neq("status", "archived")
    .order("name");
  if (villaErr) throw new Error(`Villalar okunamadı: ${villaErr.message}`);

  const villas = (villaRows ?? []) as {
    id: string;
    name: string;
    status: VillaStatus;
  }[];

  const [{ data: blockRows, error: blockErr }, { data: bookingRows, error: bookErr }] =
    await Promise.all([
      supabase
        .from("villa_blocks")
        .select("id, villa_id, starts_on, ends_on, source, note")
        .lt("starts_on", to)
        .gt("ends_on", from)
        .order("starts_on"),
      // Booking bloklarını eşlemek için pencereye değen onaylı talepler.
      // villa_blocks'ta booking_requests'e FK yok; villa + tarih ile eşleşir
      // (updateBookingStatus'un bloğu yazma varsayımıyla aynı).
      supabase
        .from("booking_requests")
        .select(
          "id, villa_id, check_in, check_out, full_name, phone, price_estimate, paid_amount"
        )
        .eq("status", "confirmed")
        .lt("check_in", to)
        .gt("check_out", from),
    ]);
  if (blockErr) throw new Error(`Bloklar okunamadı: ${blockErr.message}`);
  if (bookErr) throw new Error(`Rezervasyonlar okunamadı: ${bookErr.message}`);

  // villa_id + tarih anahtarıyla hızlı eşleşme.
  const bookingKey = (villaId: string, ci: string, co: string) =>
    `${villaId}|${ci}|${co}`;
  const bookingByKey = new Map<string, BlockBooking>();
  for (const r of (bookingRows ?? []) as {
    id: string;
    villa_id: string;
    check_in: string;
    check_out: string;
    full_name: string;
    phone: string;
    price_estimate: number | null;
    paid_amount: number;
  }[]) {
    bookingByKey.set(bookingKey(r.villa_id, r.check_in, r.check_out), {
      id: r.id,
      guestName: r.full_name,
      phone: r.phone,
      checkIn: r.check_in,
      checkOut: r.check_out,
      priceEstimate: r.price_estimate,
      paidAmount: r.paid_amount,
    });
  }

  const blocksByVilla = new Map<string, CalendarBlock[]>();
  for (const b of (blockRows ?? []) as {
    id: string;
    villa_id: string;
    starts_on: string;
    ends_on: string;
    source: CalendarBlock["source"];
    note: string | null;
  }[]) {
    const list = blocksByVilla.get(b.villa_id) ?? [];
    list.push({
      id: b.id,
      startsOn: b.starts_on,
      endsOn: b.ends_on,
      source: b.source,
      note: b.note,
      booking:
        b.source === "booking"
          ? bookingByKey.get(bookingKey(b.villa_id, b.starts_on, b.ends_on)) ??
            null
          : null,
    });
    blocksByVilla.set(b.villa_id, list);
  }

  return {
    from,
    to,
    days,
    villas: villas.map((v) => ({
      id: v.id,
      name: v.name,
      status: v.status,
      blocks: blocksByVilla.get(v.id) ?? [],
    })),
  };
}
