import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Yönetim istemcisi — service_role anahtarı kullanır ve RLS'i ATLAR.
 *
 * Yalnızca sunucuda, yetki kontrolünü kendin yaptıktan sonra kullan:
 * rezervasyon talebi kaydı, yönetim paneli yazma işlemleri gibi.
 * Asla istemci bileşenine sızdırma.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase yönetim ayarları eksik: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createClient(url, key, { auth: { persistSession: false } });
}
