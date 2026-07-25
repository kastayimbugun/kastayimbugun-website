import "server-only";
import { supabaseSession } from "@/lib/supabase/session";

export interface RegionOption {
  id: string;
  name: string;
  province: string;
}

/** Villa formundaki bölge açılır listesi için. */
export async function getRegionOptions(): Promise<RegionOption[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("regions")
    .select("id, name, province")
    .order("sort_order");
  if (error) throw new Error(`Bölgeler okunamadı: ${error.message}`);
  return data;
}
