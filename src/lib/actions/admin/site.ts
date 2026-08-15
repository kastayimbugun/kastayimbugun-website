"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import { storeImage, removeImage, type StoreError } from "@/lib/images/store";
import { imageUrl } from "@/lib/images/url";
import { siteSettingsSchema } from "@/lib/schemas/adminSite";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";
import { resolveVillaDetailPrefs } from "@/lib/villaDetailPrefs";
import {
  resolveHeaderConfig,
  resolveFooterConfig,
} from "@/lib/headerFooter";

export type SiteResult =
  | { ok: true }
  | { ok: false; error: "auth" | StoreError };

/** Footer görseli yüklemede path + url döner (jsonb'ye çağıran taraf yazar). */
export type FooterImageResult =
  | { ok: true; path: string; url: string }
  | { ok: false; error: "auth" | StoreError };

export type SiteSettingsResult =
  | { ok: true }
  | {
      ok: false;
      error: "auth" | "validation" | "generic";
      fields?: Record<string, string>;
    };

/** `site_settings` içindeki görsel sütunları. */
type ImageColumn =
  | "hero_image"
  | "logo_image"
  | "favicon_image"
  | "og_image"
  | "ad_web_image"
  | "ad_mobile_image";

function revalidate() {
  revalidatePath("/yonetim/ayarlar");
  // Marka adı, logo ve iletişim bilgisi her sayfada görünebiliyor; ana sayfayla
  // sınırlı tazeleme yetmez. "layout" tüm rotaları kapsar.
  revalidatePath("/", "layout");
}

/** Sütundaki mevcut Storage yolu (eskisini silmek için). */
async function currentPath(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  column: ImageColumn
) {
  const { data } = await supabase
    .from("site_settings")
    .select(column)
    .maybeSingle();
  return (data as Record<string, string | null> | null)?.[column] ?? null;
}

/**
 * Site geneli bir görseli yükler ve ilgili sütuna yazar. Üç görsel de
 * (hero / logo / OG) aynı akışı paylaşıyor: yükle → kaydet → eskisini sil.
 * Kayıt başarısızsa yüklenen dosya ortada bırakılmaz.
 */
async function uploadSettingImage(
  column: ImageColumn,
  prefix: string,
  file: FormDataEntryValue | null,
  animated = false
): Promise<SiteResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();
  const previous = await currentPath(supabase, column);

  const stored = await storeImage(supabase, file, prefix, animated);
  if (!stored.ok) return stored;

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: true, [column]: stored.path });
  if (error) {
    await removeImage(supabase, stored.path);
    return { ok: false, error: "generic" };
  }

  await removeImage(supabase, previous);
  revalidate();
  return { ok: true };
}

async function removeSettingImage(column: ImageColumn): Promise<SiteResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();
  const previous = await currentPath(supabase, column);

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: true, [column]: null });
  if (error) return { ok: false, error: "generic" };

  await removeImage(supabase, previous);
  revalidate();
  return { ok: true };
}

/** Ana sayfa hero görseli — tam genişlikte gösterilir. */
export async function uploadSiteHero(formData: FormData): Promise<SiteResult> {
  return uploadSettingImage("hero_image", "site/hero", formData.get("file"));
}

export async function removeSiteHero(): Promise<SiteResult> {
  return removeSettingImage("hero_image");
}

/** Üst bardaki ve konfirmasyon çıktısındaki logo. */
export async function uploadSiteLogo(formData: FormData): Promise<SiteResult> {
  return uploadSettingImage("logo_image", "site/logo", formData.get("file"));
}

export async function removeSiteLogo(): Promise<SiteResult> {
  return removeSettingImage("logo_image");
}

/** Tarayıcı sekmelerinde görünen ikona (Favicon). */
export async function uploadSiteFavicon(formData: FormData): Promise<SiteResult> {
  return uploadSettingImage("favicon_image", "site/favicon", formData.get("file"), true);
}

export async function removeSiteFavicon(): Promise<SiteResult> {
  return removeSettingImage("favicon_image");
}

/** Sosyal medyada paylaşılınca görünen kart görseli. */
export async function uploadSiteOgImage(
  formData: FormData
): Promise<SiteResult> {
  return uploadSettingImage("og_image", "site/og", formData.get("file"));
}

export async function removeSiteOgImage(): Promise<SiteResult> {
  return removeSettingImage("og_image");
}

/** Reklam bandı — web (yatay) görseli. GIF animasyonu korunur. */
export async function uploadAdWebImage(
  formData: FormData
): Promise<SiteResult> {
  return uploadSettingImage("ad_web_image", "site/ad-web", formData.get("file"), true);
}

export async function removeAdWebImage(): Promise<SiteResult> {
  return removeSettingImage("ad_web_image");
}

/** Reklam bandı — mobil görseli. GIF animasyonu korunur. */
export async function uploadAdMobileImage(
  formData: FormData
): Promise<SiteResult> {
  return uploadSettingImage("ad_mobile_image", "site/ad-mobile", formData.get("file"), true);
}

export async function removeAdMobileImage(): Promise<SiteResult> {
  return removeSettingImage("ad_mobile_image");
}

/**
 * Footer rozet görseli (TÜRSAB, sertifika, ödeme ikonu). DB kolonu yerine
 * yolu döndürür — çağıran taraf footer_config jsonb'sine ekler. SVG korunur.
 */
export async function uploadFooterImage(
  formData: FormData
): Promise<FooterImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };
  const supabase = await supabaseSession();
  const stored = await storeImage(supabase, formData.get("file"), "site/footer");
  if (!stored.ok) return stored;
  return { ok: true, path: stored.path, url: imageUrl(stored.path) ?? "" };
}

/**
 * Metin ayarlarını topluca kaydeder. Boş bırakılan alan `null` yazılır ve
 * uygulama o metin için koddaki varsayılana geri döner (bkz. adminSite şeması).
 */
export async function saveSiteSettings(
  input: unknown
): Promise<SiteSettingsResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = siteSettingsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }

  const d = parsed.data;
  const supabase = await supabaseSession();
  const row = {
    id: true,
    hero_video_url: d.heroVideoUrl,
    brand_name: d.brandName,
    agency_name: d.agencyName,
    tursab_no: d.tursabNo,
    phone: d.phone,
    whatsapp: d.whatsapp,
    email: d.email,
    address: d.address,
    instagram_url: d.instagramUrl,
    facebook_url: d.facebookUrl,
    hero_title_tr: d.heroTitleTr,
    hero_title_en: d.heroTitleEn,
    hero_subtitle_tr: d.heroSubtitleTr,
    hero_subtitle_en: d.heroSubtitleEn,
    seo_title_tr: d.seoTitleTr,
    seo_title_en: d.seoTitleEn,
    seo_description_tr: d.seoDescriptionTr,
    seo_description_en: d.seoDescriptionEn,
    confirmation_deposit_note: d.confirmationDepositNote,
    confirmation_checkin_note: d.confirmationCheckinNote,
    // Ham nesneyi temizleyip tam/normalize edilmiş tercihleri jsonb yaz.
    villa_detail_prefs: resolveVillaDetailPrefs(d.villaDetailPrefs),
    ad_show_web: d.adShowWeb,
    ad_show_mobile: d.adShowMobile,
    ad_link_url: d.adLinkUrl,
    header_config: resolveHeaderConfig(d.headerConfig),
    footer_config: resolveFooterConfig(d.footerConfig),
    // null → tüm bölgeler; dizi → yalnızca seçilenler (jsonb).
    home_regions: d.homeRegions ?? null,
    // Ana sayfa bölüm sırası (jsonb). null → varsayılan sıra.
    home_sections: d.homeSections ?? null,
    watermark_enabled: d.watermarkEnabled,
    watermark_opacity: d.watermarkOpacity,
    watermark_scale: d.watermarkScale,
    watermark_position: d.watermarkPosition,
  };

  let { error } = await supabase.from("site_settings").upsert(row);

  // Yeni kolonlar (0013/0014/0015/0017/0018) henüz uygulanmadıysa diğer ayarların
  // kaydını engellememek için bu alanlar olmadan tekrar dene.
  if (
    error &&
    /villa_detail_prefs|ad_show_web|ad_show_mobile|ad_link_url|header_config|footer_config|watermark_|home_regions|home_sections/.test(
      error.message ?? ""
    )
  ) {
    const {
      villa_detail_prefs: _p,
      ad_show_web: _w,
      ad_show_mobile: _m,
      ad_link_url: _l,
      header_config: _h,
      footer_config: _f,
      watermark_enabled: _we,
      watermark_opacity: _wo,
      watermark_scale: _ws,
      watermark_position: _wp,
      home_regions: _hr,
      home_sections: _hs,
      ...rest
    } = row;
    void [_p, _w, _m, _l, _h, _f, _we, _wo, _ws, _wp, _hr, _hs];
    ({ error } = await supabase.from("site_settings").upsert(rest));
  }

  if (error) return { ok: false, error: "generic" };

  revalidate();
  return { ok: true };
}
