import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { CustomPage } from "@/lib/types";
import { mapPage } from "@/lib/data/pages";

/**
 * Yönetim paneli için tüm sayfaları (taslak + yayınlanmış) listeler.
 *
 * Oturumlu (authenticated) istemci kullanır: pages RLS select politikası
 * yalnızca `status='published'` VEYA `auth.role()='authenticated'` satırlarını
 * döndürür; anon istemci taslakları göremediğinden panelde kaybolurlardı.
 */
export async function getAdminPages(): Promise<CustomPage[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
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
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("pages")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return mapPage(data);
}
