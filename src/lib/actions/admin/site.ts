"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import { storeImage, removeImage, type StoreError } from "@/lib/images/store";
import { siteSettingsSchema } from "@/lib/schemas/adminSite";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";

export type SiteResult =
  | { ok: true }
  | { ok: false; error: "auth" | StoreError };

export type SiteSettingsResult =
  | { ok: true }
  | {
      ok: false;
      error: "auth" | "validation" | "generic";
      fields?: Record<string, string>;
    };

/** `site_settings` içindeki görsel sütunları. */
type ImageColumn = "hero_image" | "logo_image" | "og_image";

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
  file: FormDataEntryValue | null
): Promise<SiteResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();
  const previous = await currentPath(supabase, column);

  const stored = await storeImage(supabase, file, prefix);
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

/** Sosyal medyada paylaşılınca görünen kart görseli. */
export async function uploadSiteOgImage(
  formData: FormData
): Promise<SiteResult> {
  return uploadSettingImage("og_image", "site/og", formData.get("file"));
}

export async function removeSiteOgImage(): Promise<SiteResult> {
  return removeSettingImage("og_image");
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
  const { error } = await supabase.from("site_settings").upsert({
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
  });

  if (error) return { ok: false, error: "generic" };

  revalidate();
  return { ok: true };
}
