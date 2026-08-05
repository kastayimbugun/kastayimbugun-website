import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { nightsBetween } from "@/lib/format";
import type { BookingStatus } from "@/lib/schemas/adminBooking";

export interface AdminBooking {
  id: string;
  villaId: string | null;
  villaName: string;
  villaSlug: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  babies: number;
  fullName: string;
  phone: string;
  email: string | null;
  note: string | null;
  priceEstimate: number | null;
  paidAmount: number;
  damageDeposit: number;
  depositNote: string | null;
  status: BookingStatus;
  createdAt: string;
}

interface Row {
  id: string;
  villa_id: string | null;
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
  paid_amount: number;
  damage_deposit: number;
  deposit_note: string | null;
  status: BookingStatus;
  created_at: string;
  villas: { name: string; slug: string } | null;
}

export type BookingSort = "new" | "checkin";

export interface BookingFilters {
  status?: BookingStatus;
  /**
   * `status` verilmediğinde uygulanan tersi filtre — Talepler ekranının
   * varsayılan görünümü "Onaylandı" hariç hepsini gösterir (onaylanan talep
   * Rezervasyonlar sayfasına "taşınmış" gibi davranır; bkz. §0 kıyas notu).
   */
  excludeStatus?: BookingStatus;
  /** Ad / telefon / e-posta içinde arama. */
  q?: string;
  villaId?: string;
  /** Giriş tarihi bu tarihten itibaren. */
  from?: string;
  /** Giriş tarihi bu tarihe kadar. */
  to?: string;
  sort?: BookingSort;
  page?: number;
}

export interface BookingPage {
  rows: AdminBooking[];
  total: number;
  page: number;
  pageCount: number;
}

export const BOOKINGS_PAGE_SIZE = 25;

/**
 * PostgREST `or` filtresi virgül ve parantezle ayrışır; `%` de joker karakter.
 * Kullanıcı girdisi doğrudan gömülmeden bu karakterlerden arındırılır.
 */
function safeTerm(input: string): string {
  return input.replace(/[,()%*\\"']/g, " ").trim().slice(0, 60);
}

/**
 * Durum DIŞINDAKİ filtreleri uygular. Durum ayrı tutulur çünkü rozet sayıları
 * "aynı filtrede her durumdan kaç tane var" sorusuna cevap verir.
 */
function withFilters(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  f: BookingFilters,
  select: string,
  options?: { count: "exact"; head: boolean }
) {
  let q = supabase.from("booking_requests").select(select, options);

  if (f.villaId) q = q.eq("villa_id", f.villaId);
  if (f.from) q = q.gte("check_in", f.from);
  if (f.to) q = q.lte("check_in", f.to);

  const term = f.q ? safeTerm(f.q) : "";
  if (term) {
    q = q.or(
      `full_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%`
    );
  }
  return q;
}

/**
 * Rezervasyon taleplerini filtreli ve sayfalı listeler. Oturumlu istemci →
 * RLS yalnızca personele izin verir (docs/panel-kurallari.md §1). PII
 * (telefon/e-posta) yalnızca burada, panelde ve sayfa başına sınırlı görünür.
 */
export async function getBookingRequests(
  f: BookingFilters = {}
): Promise<BookingPage> {
  const supabase = await supabaseSession();
  const page = Math.max(1, Math.trunc(f.page ?? 1));
  const offset = (page - 1) * BOOKINGS_PAGE_SIZE;

  let query = withFilters(
    supabase,
    f,
    `id, villa_id, check_in, check_out, adults, children, babies,
     full_name, phone, email, note, price_estimate,
     paid_amount, damage_deposit, deposit_note, status, created_at,
     villas ( name, slug )`,
    { count: "exact", head: false }
  );

  if (f.status) query = query.eq("status", f.status);
  else if (f.excludeStatus) query = query.neq("status", f.excludeStatus);

  query =
    f.sort === "checkin"
      ? query.order("check_in", { ascending: true })
      : query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(
    offset,
    offset + BOOKINGS_PAGE_SIZE - 1
  );
  if (error) throw new Error(`Talepler okunamadı: ${error.message}`);

  const total = count ?? 0;
  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / BOOKINGS_PAGE_SIZE)),
    rows: (data as unknown as Row[]).map((r) => ({
      id: r.id,
      villaId: r.villa_id,
      villaName: r.villas?.name ?? "—",
      villaSlug: r.villas?.slug ?? null,
      checkIn: r.check_in,
      checkOut: r.check_out,
      nights: nightsBetween(r.check_in, r.check_out),
      adults: r.adults,
      children: r.children,
      babies: r.babies,
      fullName: r.full_name,
      phone: r.phone,
      email: r.email,
      note: r.note,
      priceEstimate: r.price_estimate,
      paidAmount: r.paid_amount,
      damageDeposit: r.damage_deposit,
      depositNote: r.deposit_note,
      status: r.status,
      createdAt: r.created_at,
    })),
  };
}

/**
 * Duruma göre talep sayıları (filtre sekmelerindeki rozetler için).
 * Aktif villa/tarih/arama filtreleri sayılara da yansır — rozetteki sayı ile
 * listede görülen kayıt sayısı tutarlı olsun diye.
 *
 * Durum başına `count: "exact", head: true`: satır gövdesi hiç taşınmaz.
 * Önceki sürüm tüm tabloyu çekip JS'te sayıyordu; PostgREST'in `max-rows`
 * sınırına (Supabase'de tipik 1000) dayandığında sayılar sessizce yanlıştı.
 */
export async function getBookingCounts(
  f: BookingFilters = {}
): Promise<Record<BookingStatus, number>> {
  const supabase = await supabaseSession();
  const statuses: BookingStatus[] = [
    "new",
    "contacted",
    "confirmed",
    "cancelled",
  ];

  const results = await Promise.all(
    statuses.map((s) =>
      withFilters(supabase, f, "*", { count: "exact", head: true }).eq(
        "status",
        s
      )
    )
  );

  const counts = {} as Record<BookingStatus, number>;
  statuses.forEach((s, i) => {
    const { error, count } = results[i];
    if (error) throw new Error(`Talep sayıları okunamadı: ${error.message}`);
    counts[s] = count ?? 0;
  });
  return counts;
}

export interface BookingConfirmation {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  babies: number;
  priceEstimate: number | null;
  paidAmount: number;
  damageDeposit: number;
  depositNote: string | null;
  status: BookingStatus;
  villa: {
    id: string;
    name: string;
    slug: string;
    checkInTime: string;
    checkOutTime: string;
    petFriendly: boolean;
  } | null;
}

/**
 * Tek bir talebin, misafire gönderilecek konfirmasyon sayfası için ihtiyaç
 * duyduğu tüm bilgisi (kaspanel26'daki "Rezervasyon Konfirmasyon Formu"
 * PDF'inin karşılığı — bkz. /yonetim/talepler/[id]/konfirmasyon).
 */
export async function getBookingForConfirmation(
  id: string
): Promise<BookingConfirmation | null> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("booking_requests")
    .select(
      `id, check_in, check_out, adults, children, babies,
       full_name, phone, email, price_estimate,
       paid_amount, damage_deposit, deposit_note, status,
       villas ( id, name, slug, check_in, check_out, amenities )`
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Talep okunamadı: ${error.message}`);
  if (!data) return null;

  const r = data as unknown as {
    id: string;
    check_in: string;
    check_out: string;
    adults: number;
    children: number;
    babies: number;
    full_name: string;
    phone: string;
    email: string | null;
    price_estimate: number | null;
    paid_amount: number;
    damage_deposit: number;
    deposit_note: string | null;
    status: BookingStatus;
    villas: {
      id: string;
      name: string;
      slug: string;
      check_in: string;
      check_out: string;
      amenities: string[];
    } | null;
  };

  return {
    id: r.id,
    fullName: r.full_name,
    phone: r.phone,
    email: r.email,
    checkIn: r.check_in,
    checkOut: r.check_out,
    nights: nightsBetween(r.check_in, r.check_out),
    adults: r.adults,
    children: r.children,
    babies: r.babies,
    priceEstimate: r.price_estimate,
    paidAmount: r.paid_amount,
    damageDeposit: r.damage_deposit,
    depositNote: r.deposit_note,
    status: r.status,
    villa: r.villas
      ? {
          id: r.villas.id,
          name: r.villas.name,
          slug: r.villas.slug,
          checkInTime: r.villas.check_in,
          checkOutTime: r.villas.check_out,
          petFriendly: r.villas.amenities.includes("petFriendly"),
        }
      : null,
  };
}
