import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { imageUrl } from "@/lib/images/url";

/** Panelde düzenlenebilen metin alanları — boş olanlar koddaki varsayılana düşer. */
export interface SiteSettingsText {
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
  confirmationDepositNote: string | null;
  confirmationCheckinNote: string | null;
}

export interface AdminSiteSettings extends SiteSettingsText {
  /** Storage yolu — silerken gerekiyor. */
  heroImagePath: string | null;
  /** Görüntülemek için tam URL. */
  heroImageUrl: string | null;
  heroVideoUrl: string | null;
  logoImagePath: string | null;
  logoImageUrl: string | null;
  ogImagePath: string | null;
  ogImageUrl: string | null;
}

/** Panelin okuduğu tüm site ayarları (tek satırlık `site_settings`). */
export async function getAdminSiteSettings(): Promise<AdminSiteSettings> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("site_settings")
    .select(
      `hero_image, hero_video_url, logo_image, og_image,
       brand_name, agency_name, tursab_no,
       phone, whatsapp, email, address, instagram_url, facebook_url,
       hero_title_tr, hero_title_en, hero_subtitle_tr, hero_subtitle_en,
       seo_title_tr, seo_title_en, seo_description_tr, seo_description_en,
       confirmation_deposit_note, confirmation_checkin_note`
    )
    .maybeSingle();

  if (error) throw new Error(`Site ayarları okunamadı: ${error.message}`);

  const r = (data ?? {}) as Record<string, string | null>;

  return {
    heroImagePath: r.hero_image ?? null,
    heroImageUrl: imageUrl(r.hero_image),
    heroVideoUrl: r.hero_video_url ?? null,
    logoImagePath: r.logo_image ?? null,
    logoImageUrl: imageUrl(r.logo_image),
    ogImagePath: r.og_image ?? null,
    ogImageUrl: imageUrl(r.og_image),

    brandName: r.brand_name ?? null,
    agencyName: r.agency_name ?? null,
    tursabNo: r.tursab_no ?? null,
    phone: r.phone ?? null,
    whatsapp: r.whatsapp ?? null,
    email: r.email ?? null,
    address: r.address ?? null,
    instagramUrl: r.instagram_url ?? null,
    facebookUrl: r.facebook_url ?? null,
    heroTitleTr: r.hero_title_tr ?? null,
    heroTitleEn: r.hero_title_en ?? null,
    heroSubtitleTr: r.hero_subtitle_tr ?? null,
    heroSubtitleEn: r.hero_subtitle_en ?? null,
    seoTitleTr: r.seo_title_tr ?? null,
    seoTitleEn: r.seo_title_en ?? null,
    seoDescriptionTr: r.seo_description_tr ?? null,
    seoDescriptionEn: r.seo_description_en ?? null,
    confirmationDepositNote: r.confirmation_deposit_note ?? null,
    confirmationCheckinNote: r.confirmation_checkin_note ?? null,
  };
}
