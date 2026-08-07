import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { CustomPage } from "@/lib/types";
import { mapPage } from "@/lib/data/pages";

/**
 * Yönetim paneli için tüm sayfaları (taslak + yayınlanmış) listeler.
 */
export async function getAdminPages(): Promise<CustomPage[]> {
  const { data, error } = await supabaseServer()
    .from("pages")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapPage);
}

/**
 * Yönetim paneli düzenleme ekranı için ID ile sayfa detayını getirir.
 */
export async function getAdminPageById(id: string): Promise<CustomPage | null> {
  const { data, error } = await supabaseServer()
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapPage(data);
}
