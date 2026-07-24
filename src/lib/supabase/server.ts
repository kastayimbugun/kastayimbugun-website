import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Sunucu tarafı okuma istemcisi (anon anahtar → RLS geçerli).
 * Yalnızca yayınlanmış içeriği görür; sayfalarda bunu kullan.
 */
export function supabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase ayarları eksik: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
