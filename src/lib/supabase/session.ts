import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Çerez tabanlı Supabase istemcisi — giriş yapan kullanıcının oturumunu taşır.
 * Panel bu istemciyi kullanır; RLS her istekte devrededir (docs/panel-kurallari.md §1).
 *
 * Sunucu bileşeninde çerez yazılamaz (yalnızca Server Action / Route Handler yazabilir);
 * o bağlamda setAll no-op'tur, oturum tazeleme proxy.ts'te yapılır.
 */
export async function supabaseSession() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase ayarları eksik: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Sunucu bileşeni bağlamı: çerez yazılamaz, yoksay.
        }
      },
    },
  });
}
