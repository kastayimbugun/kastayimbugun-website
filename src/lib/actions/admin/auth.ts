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

  const supabase = await supabaseSession();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: "Giriş başarısız. Bilgileri kontrol edin." };
  }

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
