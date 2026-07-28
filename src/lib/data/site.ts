import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images/url";

/** Ana sayfa hero'su gibi site geneli medya ayarları (site_settings tek satır). */
export interface SiteSettings {
  heroImage: string | null;
  heroVideoUrl: string | null;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabaseServer()
    .from("site_settings")
    .select("hero_image, hero_video_url")
    .maybeSingle();

  // Ayar okunamazsa ana sayfa çökmemeli; hero villa görseline düşer.
  if (error || !data) return { heroImage: null, heroVideoUrl: null };

  return {
    heroImage: imageUrl(data.hero_image),
    heroVideoUrl: data.hero_video_url || null,
  };
}
