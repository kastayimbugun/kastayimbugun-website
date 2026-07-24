import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import type { BookingStatus } from "@/lib/schemas/adminBooking";

export interface AdminBooking {
  id: string;
  villaName: string;
  villaSlug: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  babies: number;
  fullName: string;
  phone: string;
  email: string | null;
  note: string | null;
  priceEstimate: number | null;
  status: BookingStatus;
  createdAt: string;
}

interface Row {
  id: string;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  babies: number;
  full_name: string;
  phone: string;
  email: string | null;
  note: string | null;
  price_estimate: number | null;
  status: BookingStatus;
  created_at: string;
  villas: { name: string; slug: string } | null;
}

/**
 * Rezervasyon taleplerini listeler. Oturumlu istemci → RLS yalnızca personele
 * izin verir (docs/panel-kurallari.md §1). PII (telefon/e-posta) yalnızca burada,
 * panelde görünür.
 */
export async function getBookingRequests(
  status?: BookingStatus
): Promise<AdminBooking[]> {
  const supabase = await supabaseSession();

  let query = supabase
    .from("booking_requests")
    .select(
      `id, check_in, check_out, adults, children, babies,
       full_name, phone, email, note, price_estimate, status, created_at,
       villas ( name, slug )`
    )
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw new Error(`Talepler okunamadı: ${error.message}`);

  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    villaName: r.villas?.name ?? "—",
    villaSlug: r.villas?.slug ?? null,
    checkIn: r.check_in,
    checkOut: r.check_out,
    adults: r.adults,
    children: r.children,
    babies: r.babies,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    note: r.note,
    priceEstimate: r.price_estimate,
    status: r.status,
    createdAt: r.created_at,
  }));
}

/** Duruma göre talep sayıları (filtre sekmelerindeki rozetler için). */
export async function getBookingCounts(): Promise<Record<string, number>> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("booking_requests")
    .select("status");
  if (error) throw new Error(`Talep sayıları okunamadı: ${error.message}`);

  const counts: Record<string, number> = {};
  for (const row of data as { status: string }[]) {
    counts[row.status] = (counts[row.status] ?? 0) + 1;
  }
  return counts;
}
