import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { imageUrl } from "@/lib/images/url";

export interface AdminSiteSettings {
  /** Storage yolu — silerken gerekiyor. */
  heroImagePath: string | null;
  /** Görüntülemek için tam URL. */
  heroImageUrl: string | null;
  heroVideoUrl: string | null;
}

export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("site_settings")
    .select("hero_image, hero_video_url")
    .maybeSingle();

  if (error) throw new Error(`Site ayarları okunamadı: ${error.message}`);

  return {
    heroImagePath: data?.hero_image ?? null,
    heroImageUrl: imageUrl(data?.hero_image),
    heroVideoUrl: data?.hero_video_url ?? null,
  };
}
