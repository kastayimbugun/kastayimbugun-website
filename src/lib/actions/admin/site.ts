"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import { storeImage, removeImage, type StoreError } from "@/lib/images/store";
import { heroVideoSchema } from "@/lib/schemas/adminSite";

export type SiteResult =
  | { ok: true }
  | { ok: false; error: "auth" | StoreError };

function revalidate() {
  revalidatePath("/yonetim/ayarlar");
  revalidatePath("/"); // ana sayfa hero'su
}

/** Mevcut hero görselinin Storage yolunu döndürür (eskisini silmek için). */
async function currentHeroPath(
  supabase: Awaited<ReturnType<typeof supabaseSession>>
) {
  const { data } = await supabase
    .from("site_settings")
    .select("hero_image")
    .maybeSingle();
  return data?.hero_image ?? null;
}

/** Ana sayfa hero görselini yükler. FormData: file. */
export async function uploadSiteHero(formData: FormData): Promise<SiteResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();
  const previous = await currentHeroPath(supabase);

  // Hero tam genişlikte gösterilir; galeriden daha büyük bir uzun kenar hak ediyor.
  const stored = await storeImage(supabase, formData.get("file"), "site/hero");
  if (!stored.ok) return stored;

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: true, hero_image: stored.path });
  if (error) {
    await removeImage(supabase, stored.path); // kayıt olmadıysa dosyayı bırakma
    return { ok: false, error: "generic" };
  }

  await removeImage(supabase, previous);
  revalidate();
  return { ok: true };
}

export async function removeSiteHero(): Promise<SiteResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const supabase = await supabaseSession();
  const previous = await currentHeroPath(supabase);

  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: true, hero_image: null });
  if (error) return { ok: false, error: "generic" };

  await removeImage(supabase, previous);
  revalidate();
  return { ok: true };
}

export async function saveHeroVideo(input: unknown): Promise<SiteResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = heroVideoSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ id: true, hero_video_url: parsed.data.heroVideoUrl });
  if (error) return { ok: false, error: "generic" };

  revalidate();
  return { ok: true };
}
