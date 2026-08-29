import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import type { StaffRole } from "@/lib/auth/staff";

/**
 * Personel listesi (yalnızca admin ekranından çağrılır).
 *
 * Oturumlu istemci → RLS: profiles select politikası "id = auth.uid() or is_staff()".
 * Admin is_staff olduğundan tüm profilleri okur. E-posta profiles'a denormalize
 * kopyalandığı için auth.admin API'sine gitmeye gerek yok.
 */

export interface StaffMember {
  id: string;
  email: string | null;
  fullName: string | null;
  role: StaffRole;
  permissions: string[];
  createdAt: string;
}

interface Row {
  id: string;
  email: string | null;
  full_name: string | null;
  role: StaffRole;
  permissions: string[] | null;
  created_at: string;
}

export async function listStaff(): Promise<StaffMember[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, permissions, created_at")
    .in("role", ["admin", "editor"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Personel okunamadı: ${error.message}`);

  return (data as unknown as Row[]).map((r) => ({
    id: r.id,
    email: r.email,
    fullName: r.full_name,
    role: r.role,
    permissions: Array.isArray(r.permissions) ? r.permissions : [],
    createdAt: r.created_at,
  }));
}

/** Sistemdeki admin sayısı — son adminin düşürülmesini/silinmesini engellemek için. */
export async function countAdmins(): Promise<number> {
  const supabase = await supabaseSession();
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error(`Admin sayısı okunamadı: ${error.message}`);
  return count ?? 0;
}
