import "server-only";
import { supabaseSession } from "@/lib/supabase/session";

export type StaffRole = "admin" | "editor";

export interface StaffUser {
  id: string;
  email: string | null;
  role: StaffRole;
  fullName: string | null;
}

/**
 * Giriş yapan personel kullanıcısını döndürür; personel değilse null.
 *
 * GÜVENLİK: Panelin her sayfası ve her Server Action'ı BUNU ilk satırda çağırır
 * (docs/panel-kurallari.md §1, Katman 2 ve 3). getUser() JWT'yi Supabase Auth
 * sunucusunda doğrular; rol profiles tablosundan RLS ile okunur.
 */
export async function getStaffUser(): Promise<StaffUser | null> {
  const supabase = await supabaseSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: profile.role,
    fullName: profile.full_name,
  };
}
