import "server-only";
import { redirect } from "next/navigation";
import { supabaseSession } from "@/lib/supabase/session";
import { can, type ModuleKey } from "@/lib/auth/permissions";

export type StaffRole = "admin" | "editor";

export interface StaffUser {
  id: string;
  email: string | null;
  role: StaffRole;
  fullName: string | null;
  /** Erişilebilen modül anahtarları. Admin için yok sayılır (her şeye erişir). */
  permissions: string[];
}

/**
 * Giriş yapan personel kullanıcısını döndürür; personel değilse null.
 *
 * GÜVENLİK: Panelin her sayfası ve her Server Action'ı BUNU ilk satırda çağırır
 * (docs/panel-kurallari.md §1, Katman 2 ve 3). getUser() JWT'yi Supabase Auth
 * sunucusunda doğrular; rol + izinler profiles tablosundan RLS ile okunur.
 */
export async function getStaffUser(): Promise<StaffUser | null> {
  const supabase = await supabaseSession();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, full_name, permissions")
    .eq("id", user.id)
    .maybeSingle();

  // Geçiş dayanıklılığı: `permissions` kolonu henüz eklenmemişse (migration 0021
  // uygulanmadan kod canlıysa) sorgu hata verir. Bu durumda kolonsuz oku ki
  // giriş yapmış admin dışarı atılmasın; izinler o an boş sayılır (admin yine
  // her şeye erişir, çünkü rol izinleri yok sayar).
  let row = profile as {
    role: string;
    full_name: string | null;
    permissions?: unknown;
  } | null;

  if (error) {
    const { data: basic } = await supabase
      .from("profiles")
      .select("role, full_name")
      .eq("id", user.id)
      .maybeSingle();
    row = basic ? { ...basic, permissions: [] } : null;
  }

  if (!row || (row.role !== "admin" && row.role !== "editor")) {
    return null;
  }

  return {
    id: user.id,
    email: user.email ?? null,
    role: row.role,
    fullName: row.full_name,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
  };
}

/**
 * Katman 3 (action) guard'ı: personel VE modül izni yoksa null döner.
 * Kullanım: `const staff = await requirePermission("villas"); if (!staff) return {…auth}`.
 */
export async function requirePermission(
  key: ModuleKey
): Promise<StaffUser | null> {
  const staff = await getStaffUser();
  if (!staff) return null;
  return can(staff, key) ? staff : null;
}

/**
 * Katman 2 (sayfa) guard'ı: personel değilse girişe, izni yoksa panele yönlendirir.
 * Sayfanın en üstünde çağrılır (layout guard'ına ek savunma).
 */
export async function requireModule(key: ModuleKey): Promise<StaffUser> {
  const staff = await getStaffUser();
  if (!staff) redirect("/yonetim/giris");
  if (!can(staff, key)) redirect("/yonetim");
  return staff;
}

/** Yalnızca admin: personel yönetimi gibi ekranlar/action'lar için. */
export async function requireAdmin(): Promise<StaffUser> {
  const staff = await getStaffUser();
  if (!staff) redirect("/yonetim/giris");
  if (staff.role !== "admin") redirect("/yonetim");
  return staff;
}
