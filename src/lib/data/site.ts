import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images/url";

/**
 * Site geneli ayarlar (`site_settings` tek satır) — herkese açık okuma.
 *
 * Panelde boş bırakılan her alan `null` gelir; çağıran taraf o alan için
 * koddaki varsayılanı kullanır. Ayar okunamazsa sayfa çökmemeli: hata
 * durumunda da aynı "hepsi null" nesnesi döner.
 */
export interface SiteSettings {
  heroImage: string | null;
  heroVideoUrl: string | null;
  logoImage: string | null;
  ogImage: string | null;
  brandName: string | null;
  agencyName: string | null;
  tursabNo: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  heroTitleTr: string | null;
  heroTitleEn: string | null;
  heroSubtitleTr: string | null;
  heroSubtitleEn: string | null;
  seoTitleTr: string | null;
  seoTitleEn: string | null;
  seoDescriptionTr: string | null;
  seoDescriptionEn: string | null;
}

const EMPTY: SiteSettings = {
  heroImage: null,
  heroVideoUrl: null,
  logoImage: null,
  ogImage: null,
  brandName: null,
  agencyName: null,
  tursabNo: null,
  phone: null,
  whatsapp: null,
  email: null,
  address: null,
  instagramUrl: null,
  facebookUrl: null,
  heroTitleTr: null,
  heroTitleEn: null,
  heroSubtitleTr: null,
  heroSubtitleEn: null,
  seoTitleTr: null,
  seoTitleEn: null,
  seoDescriptionTr: null,
  seoDescriptionEn: null,
};

export async function getSiteSettings(): Promise<SiteSettings> {
  const { data, error } = await supabaseServer()
    .from("site_settings")
    .select(
      `hero_image, hero_video_url, logo_image, og_image,
       brand_name, agency_name, tursab_no,
       phone, whatsapp, email, address, instagram_url, facebook_url,
       hero_title_tr, hero_title_en, hero_subtitle_tr, hero_subtitle_en,
       seo_title_tr, seo_title_en, seo_description_tr, seo_description_en`
    )
    .maybeSingle();

  if (error || !data) return EMPTY;

  const r = data as Record<string, string | null>;

  return {
    heroImage: imageUrl(r.hero_image),
    heroVideoUrl: r.hero_video_url || null,
    logoImage: imageUrl(r.logo_image),
    ogImage: imageUrl(r.og_image),
    brandName: r.brand_name || null,
    agencyName: r.agency_name || null,
    tursabNo: r.tursab_no || null,
    phone: r.phone || null,
    whatsapp: r.whatsapp || null,
    email: r.email || null,
    address: r.address || null,
    instagramUrl: r.instagram_url || null,
    facebookUrl: r.facebook_url || null,
    heroTitleTr: r.hero_title_tr || null,
    heroTitleEn: r.hero_title_en || null,
    heroSubtitleTr: r.hero_subtitle_tr || null,
    heroSubtitleEn: r.hero_subtitle_en || null,
    seoTitleTr: r.seo_title_tr || null,
    seoTitleEn: r.seo_title_en || null,
    seoDescriptionTr: r.seo_description_tr || null,
    seoDescriptionEn: r.seo_description_en || null,
  };
}
