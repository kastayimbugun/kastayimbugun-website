import "server-only";
import { supabaseSession } from "@/lib/supabase/session";

export interface DashboardStats {
  villasTotal: number;
  villasPublished: number;
  newRequests: number;
}

/**
 * Panel özeti sayıları. Oturumlu istemci → RLS staff'e tüm villaları
 * (taslak dahil) ve talepleri okutur (docs/panel-kurallari.md §1).
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = await supabaseSession();

  const [total, published, requests] = await Promise.all([
    supabase.from("villas").select("*", { count: "exact", head: true }),
    supabase
      .from("villas")
      .select("*", { count: "exact", head: true })
      .eq("status", "published"),
    supabase
      .from("booking_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "new"),
  ]);

  return {
    villasTotal: total.count ?? 0,
    villasPublished: published.count ?? 0,
    newRequests: requests.count ?? 0,
  };
}
