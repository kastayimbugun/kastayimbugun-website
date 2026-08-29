import { businessToday } from "./format";

export type Range = { start: string; end: string };

/** Is a given day booked? Ranges are [start, end) — end is checkout (free). */
export function isBooked(iso: string, ranges: Range[]) {
  return ranges.some((r) => iso >= r.start && iso < r.end);
}

// Varsayilan "bugun" isletme gunudur (Europe/Istanbul) — sunucu UTC olsa da
// gecmis gun kontrolu tarayiciyla ayni sonucu vermeli.
export function isPast(iso: string, today = businessToday()) {
  return iso < today;
}

/** O tarihe düşen sezon fiyatı (yoksa null). Sezon aralığı [start, end). */
export function priceForDate(
  iso: string,
  seasons: { start: string; end: string; price: number }[]
): number | null {
  const s = seasons.find((s) => iso >= s.start && iso < s.end);
  return s ? s.price : null;
}

/** Does the selected [checkIn, checkOut) range overlap any booked range? */
export function rangeHasConflict(
  checkIn: string,
  checkOut: string,
  ranges: Range[]
) {
  return ranges.some((r) => checkIn < r.end && checkOut > r.start);
}

/** Build a matrix of weeks (Mon-first) for a given month. */
export function monthMatrix(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const startDay = (first.getDay() + 6) % 7; // Mon = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
