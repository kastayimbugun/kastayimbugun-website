"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { supabaseSession } from "@/lib/supabase/session";

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type LoginState = { error: string | null };

/**
 * Giriş kaba kuvvet koruması (docs/panel-kurallari.md §1, yol haritası 4.4).
 *
 * Asıl backstop Supabase Auth'un kendi IP tabanlı hız sınırıdır (GoTrue,
 * password grant'ı sunucu tarafında sınırlar). Bu, e-posta başına en iyi
 * çaba (best-effort) ek bir katman: ısınmış sunucu örneğinde tutulur, hızlı
 * otomatik denemeye sürtünme ekler. Çok örnekli kesin garanti için Faz 7'de
 * Upstash/DB sayaç. Panel 3-5 kullanıcılık iç araç olduğundan bu yeterli.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 6;
const attempts = new Map<string, { count: number; firstAt: number }>();

/** Kilitliyse kalan saniye, değilse 0. */
function lockedSeconds(email: string): number {
  const rec = attempts.get(email);
  if (!rec) return 0;
  if (Date.now() - rec.firstAt > WINDOW_MS) {
    attempts.delete(email);
    return 0;
  }
  if (rec.count >= MAX_FAILS) {
    return Math.ceil((rec.firstAt + WINDOW_MS - Date.now()) / 1000);
  }
  return 0;
}

function recordFail(email: string) {
  const rec = attempts.get(email);
  if (!rec || Date.now() - rec.firstAt > WINDOW_MS) {
    attempts.set(email, { count: 1, firstAt: Date.now() });
  } else {
    rec.count += 1;
  }
}

/**
 * Personel girişi. Başarılıysa panele yönlendirir.
 * Personel olmayan bir hesap giriş yaparsa oturum hemen kapatılır
 * (aksi halde proxy ↔ layout arasında yönlendirme döngüsü oluşur).
 */
export async function signInAction(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "E-posta veya şifre geçersiz." };
  }

  const email = parsed.data.email.toLowerCase();

  const wait = lockedSeconds(email);
  if (wait > 0) {
    const minutes = Math.ceil(wait / 60);
    return {
      error: `Çok fazla başarısız deneme. ${minutes} dakika sonra tekrar deneyin.`,
    };
  }

  const supabase = await supabaseSession();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    recordFail(email);
    // Sabit küçük gecikme: otomatik deneme hızını düşürür, kullanıcıyı
    // rahatsız etmez. (Sıralamaya dayalı bilgi sızıntısı da azalır.)
    await new Promise((r) => setTimeout(r, 400));
    return { error: "Giriş başarısız. Bilgileri kontrol edin." };
  }

  // Başarılı giriş sayacı sıfırlar.
  attempts.delete(email);

  // Personel mi? Değilse oturumu kapat.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
    await supabase.auth.signOut();
    return { error: "Bu hesabın panel yetkisi yok." };
  }

  redirect("/yonetim");
}

export async function signOutAction() {
  const supabase = await supabaseSession();
  await supabase.auth.signOut();
  redirect("/yonetim/giris");
}
