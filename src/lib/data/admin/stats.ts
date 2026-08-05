import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { toISO } from "@/lib/format";

export interface DashboardArrival {
  bookingId: string;
  villaId: string | null;
  villaName: string;
  guestName: string;
  phone: string;
}

export interface DashboardPendingRequest {
  id: string;
  villaName: string;
  fullName: string;
  createdAt: string;
}

export interface DashboardOverview {
  villasTotal: number;
  villasPublished: number;
  todayCheckIns: DashboardArrival[];
  todayCheckOuts: DashboardArrival[];
  occupiedTodayCount: number;
  pendingRequests: DashboardPendingRequest[];
  pendingRequestsTotal: number;
  last7DaysRequests: number;
  monthRequestsTotal: number;
  monthConfirmedCount: number;
  monthConfirmedRevenue: number;
}

/**
 * Panel ana ekranı için "bugün ne yapmam lazım" özeti (docs/panel-yol-haritasi.md,
 * Dalga 2.1). Sektör araştırmasının "yapmayın" uyarısına uyularak yalnızca üç
 * grup veri sunulur: bugün (giriş/çıkış/doluluk), bekleyen talepler, bu ayın
 * özeti (dönüşüm + tutar) — RevPAR/pickup/pace gibi gürültülü metrikler yok.
 *
 * Oturumlu istemci → RLS staff'e tüm villaları (taslak dahil) ve talepleri
 * okutur (docs/panel-kurallari.md §1). Her sorgu ya `count:"exact", head:true`
 * ile ucuz sayılır ya da o günün/ayın dar aralığıyla filtrelenir — tam tablo
 * taraması yok.
 */
export async function getDashboardOverview(): Promise<DashboardOverview> {
  const supabase = await supabaseSession();
  const today = toISO(new Date());

  const now = new Date();
  const monthStart = toISO(new Date(now.getFullYear(), now.getMonth(), 1));
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoISO = sevenDaysAgo.toISOString();

  const [
    villasTotalRes,
    villasPublishedRes,
    checkInsRes,
    checkOutsRes,
    occupiedRes,
    pendingRes,
    pendingTotalRes,
    last7Res,
    monthAllRes,
    monthConfirmedRes,
  ] = await Promise.all([
    supabase.from("villas").select("*", { count: "exact", head: true }),
    supabase
      .from("villas")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("booking_requests")
      .select("id, full_name, phone, villa_id, villas ( id, name )")
      .eq("status", "confirmed")
      .eq("check_in", today),
    supabase
      .from("booking_requests")
      .select("id, full_name, phone, villa_id, villas ( id, name )")
      .eq("status", "confirmed")
      .eq("check_out", today),
    supabase
      .from("villa_blocks")
      .select("villa_id")
      .lte("starts_on", today)
      .gt("ends_on", today),
    supabase
      .from("booking_requests")
      .select("id, full_name, created_at, villas ( name )")
      .eq("status", "new")
      .order("created_at", { ascending: true })
      .limit(5),
    supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
    supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgoISO),
    supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("booking_requests")
      .select("price_estimate")
      .eq("status", "confirmed")
      .gte("created_at", monthStart),
  ]);

  interface ArrivalRow {
    id: string;
    full_name: string;
    phone: string;
    villa_id: string | null;
    villas: { id: string; name: string } | null;
  }

  const toArrival = (rows: ArrivalRow[] | null): DashboardArrival[] =>
    (rows ?? []).map((r) => ({
      bookingId: r.id,
      villaId: r.villa_id,
      villaName: r.villas?.name ?? "—",
      guestName: r.full_name,
      phone: r.phone,
    }));

  const occupiedVillaIds = new Set(
    ((occupiedRes.data as { villa_id: string }[] | null) ?? []).map(
      (b) => b.villa_id
    )
  );

  const monthConfirmedRows =
    (monthConfirmedRes.data as { price_estimate: number | null }[] | null) ??
    [];

  return {
    villasTotal: villasTotalRes.count ?? 0,
    villasPublished: villasPublishedRes.count ?? 0,
    todayCheckIns: toArrival(checkInsRes.data as unknown as ArrivalRow[]),
    todayCheckOuts: toArrival(checkOutsRes.data as unknown as ArrivalRow[]),
    occupiedTodayCount: occupiedVillaIds.size,
    pendingRequests: (
      (pendingRes.data as
        | { id: string; full_name: string; created_at: string; villas: { name: string } | null }[]
        | null) ?? []
    ).map((r) => ({
      id: r.id,
      villaName: r.villas?.name ?? "—",
      fullName: r.full_name,
      createdAt: r.created_at,
    })),
    pendingRequestsTotal: pendingTotalRes.count ?? 0,
    last7DaysRequests: last7Res.count ?? 0,
    monthRequestsTotal: monthAllRes.count ?? 0,
    monthConfirmedCount: monthConfirmedRows.length,
    monthConfirmedRevenue: monthConfirmedRows.reduce(
      (sum, r) => sum + (r.price_estimate ?? 0),
      0
    ),
  };
}
