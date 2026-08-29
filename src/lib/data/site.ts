import { cache } from "react";
import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import { imageUrl } from "@/lib/images/url";
import {
  resolveVillaDetailPrefs,
  DEFAULT_VILLA_DETAIL_PREFS,
  type VillaDetailPrefs,
} from "@/lib/villaDetailPrefs";
import {
  resolveHeaderConfig,
  resolveFooterConfig,
  DEFAULT_HEADER_CONFIG,
  DEFAULT_FOOTER_CONFIG,
  type HeaderConfig,
  type FooterConfig,
} from "@/lib/headerFooter";
import { parseHomeSections, type HomeSectionItem } from "@/lib/homeSections";

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
  faviconImage: string | null;
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
  /** Villa detay sayfası görünürlük tercihleri — hep çözümlenmiş (tam) nesne. */
  villaDetailPrefs: VillaDetailPrefs;
  /** Reklam bandı — platform kapalıysa ya da görseli yoksa o platformda gösterilmez. */
  adShowWeb: boolean;
  adShowMobile: boolean;
  adWebImage: string | null;
  adMobileImage: string | null;
  adLinkUrl: string | null;
  headerConfig: HeaderConfig;
  footerConfig: FooterConfig;
  /** Ana sayfadaki "Popüler Bölgeler" için gösterilecek bölge slug'ları.
   *  null → hepsi gösterilir; [] → hiçbiri; dizi → yalnızca listelenenler. */
  homeRegions: string[] | null;
  /** Ana sayfa içerik bölümlerinin sırası + aç/kapa. null → varsayılan sıra. */
  homeSections: HomeSectionItem[] | null;
}

/** jsonb değerini slug dizisine çevirir. null → "hepsi", [] → "hiçbiri". */
export function parseHomeRegions(value: unknown): string[] | null {
  if (value == null || !Array.isArray(value)) return null;
  return value.filter((s): s is string => typeof s === "string" && s.length > 0);
}

const EMPTY: SiteSettings = {
  heroImage: null,
  heroVideoUrl: null,
  logoImage: null,
  faviconImage: null,
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
  villaDetailPrefs: DEFAULT_VILLA_DETAIL_PREFS,
  adShowWeb: false,
  adShowMobile: false,
  adWebImage: null,
  adMobileImage: null,
  adLinkUrl: null,
  headerConfig: DEFAULT_HEADER_CONFIG,
  footerConfig: DEFAULT_FOOTER_CONFIG,
  homeRegions: null,
  homeSections: null,
};

export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const base = `hero_image, hero_video_url, logo_image, favicon_image, og_image,
       brand_name, agency_name, tursab_no,
       phone, whatsapp, email, address, instagram_url, facebook_url,
       hero_title_tr, hero_title_en, hero_subtitle_tr, hero_subtitle_en,
       seo_title_tr, seo_title_en, seo_description_tr, seo_description_en`;

  const extended = `${base}, villa_detail_prefs, ad_show_web, ad_show_mobile, ad_web_image, ad_mobile_image, ad_link_url, header_config, footer_config, home_regions, home_sections`;

  let q = await supabaseServer()
    .from("site_settings")
    .select(extended)
    .maybeSingle();

  // Yeni kolonlar (0013/0014/0015/0016/0017/0018) yoksa diğer tüm ayarları
  // kaybetmemek için minimal şemayla tekrar dene.
  if (
    q.error &&
    /villa_detail_prefs|ad_show_web|ad_show_mobile|ad_web_image|ad_mobile_image|ad_link_url|header_config|footer_config|favicon_image|home_regions|home_sections/.test(
      q.error.message ?? ""
    )
  ) {
    q = await supabaseServer().from("site_settings").select(base).maybeSingle();
  }

  const { data, error } = q;
  if (error || !data) return EMPTY;

  const r = data as Record<string, unknown> & Record<string, string | null>;

  return {
    heroImage: imageUrl(r.hero_image),
    heroVideoUrl: r.hero_video_url || null,
    logoImage: imageUrl(r.logo_image),
    faviconImage: imageUrl(r.favicon_image),
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
    villaDetailPrefs: resolveVillaDetailPrefs(r.villa_detail_prefs),
    adShowWeb: Boolean(r.ad_show_web),
    adShowMobile: Boolean(r.ad_show_mobile),
    adWebImage: imageUrl(r.ad_web_image as string | null),
    adMobileImage: imageUrl(r.ad_mobile_image as string | null),
    adLinkUrl: (r.ad_link_url as string | null) || null,
    headerConfig: resolveHeaderConfig(r.header_config),
    footerConfig: resolveFooterConfig(r.footer_config),
    homeRegions: parseHomeRegions((r as Record<string, unknown>).home_regions),
    homeSections: parseHomeSections((r as Record<string, unknown>).home_sections),
  };
})
