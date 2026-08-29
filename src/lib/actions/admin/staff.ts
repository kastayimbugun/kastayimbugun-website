"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  createStaffSchema,
  updateStaffSchema,
  resetPasswordSchema,
  deleteStaffSchema,
} from "@/lib/schemas/adminStaff";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";

/**
 * Personel yönetimi — YALNIZCA admin.
 *
 * GÜVENLİK (docs/panel-kurallari.md §1): her action ilk satırda admin olduğunu
 * doğrular. Kullanıcı oluşturma/silme/şifre işlemleri auth.admin API'sini
 * gerektirdiğinden `service_role` ile yapılır — bu, panel için BİLİNÇLİ ve
 * admin-doğrulamalı bir istisnadır (aksi halde panel service_role kullanmaz).
 *
 * Değişmezler: son admin editöre düşürülemez/silinemez; admin kendini düşüremez
 * veya silemez (kilitlenmeyi önler).
 */

export type StaffActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "auth" | "validation" | "lastAdmin" | "self" | "generic";
      fields?: Record<string, string>;
    };

/** Ortak admin guard'ı. */
async function requireAdminId(): Promise<string | null> {
  const me = await getStaffUser();
  if (!me || me.role !== "admin") return null;
  return me.id;
}

async function adminCount(
  admin: ReturnType<typeof supabaseAdmin>
): Promise<number> {
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  return count ?? 0;
}

export async function createStaffUser(
  input: unknown
): Promise<StaffActionResult> {
  const meId = await requireAdminId();
  if (!meId) return { ok: false, error: "auth" };

  const parsed = createStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;
  const email = d.email.toLowerCase();

  const admin = supabaseAdmin();

  // 1) Auth kullanıcısı oluştur (e-posta doğrulanmış sayılır — davet akışı yok).
  const { data: created, error: authErr } = await admin.auth.admin.createUser({
    email,
    password: d.password,
    email_confirm: true,
  });
  if (authErr || !created.user) {
    // En yaygın hata: e-posta zaten kayıtlı.
    const msg = authErr?.message ?? "";
    const dup = /already|registered|exists/i.test(msg);
    return {
      ok: false,
      error: "validation",
      fields: {
        email: dup ? "Bu e-posta zaten kayıtlı" : "Kullanıcı oluşturulamadı",
      },
    };
  }

  // 2) Profil satırı (rol + izinler). Admin izinleri yok sayar ama veri korunur.
  const { error: profErr } = await admin.from("profiles").insert({
    id: created.user.id,
    email,
    full_name: d.fullName,
    role: d.role,
    permissions: d.role === "admin" ? [] : d.permissions,
  });

  if (profErr) {
    // Profil yazılamadıysa yetim auth kullanıcı bırakma — geri al.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "generic" };
  }

  revalidatePath("/yonetim/personel");
  return { ok: true };
}

export async function updateStaffMember(
  input: unknown
): Promise<StaffActionResult> {
  const meId = await requireAdminId();
  if (!meId) return { ok: false, error: "auth" };

  const parsed = updateStaffSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;

  const admin = supabaseAdmin();
  const { data: current } = await admin
    .from("profiles")
    .select("role")
    .eq("id", d.id)
    .maybeSingle();
  if (!current) return { ok: false, error: "generic" };

  const demotingAdmin = current.role === "admin" && d.role !== "admin";
  if (demotingAdmin) {
    // Kendini adminlikten düşürme yok.
    if (d.id === meId) return { ok: false, error: "self" };
    // Son admini düşürme yok.
    if ((await adminCount(admin)) <= 1) return { ok: false, error: "lastAdmin" };
  }

  const { error } = await admin
    .from("profiles")
    .update({
      full_name: d.fullName,
      role: d.role,
      permissions: d.role === "admin" ? [] : d.permissions,
    })
    .eq("id", d.id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath("/yonetim/personel");
  return { ok: true };
}

export async function resetStaffPassword(
  input: unknown
): Promise<StaffActionResult> {
  const meId = await requireAdminId();
  if (!meId) return { ok: false, error: "auth" };

  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }

  const admin = supabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(parsed.data.id, {
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: "generic" };

  return { ok: true };
}

export async function deleteStaffMember(
  input: unknown
): Promise<StaffActionResult> {
  const meId = await requireAdminId();
  if (!meId) return { ok: false, error: "auth" };

  const parsed = deleteStaffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { id } = parsed.data;

  // Kendini silme yok.
  if (id === meId) return { ok: false, error: "self" };

  const admin = supabaseAdmin();
  const { data: target } = await admin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .maybeSingle();
  if (!target) return { ok: false, error: "generic" };

  // Son admini silme yok.
  if (target.role === "admin" && (await adminCount(admin)) <= 1) {
    return { ok: false, error: "lastAdmin" };
  }

  // Auth kullanıcıyı sil → profiles FK on delete cascade ile temizlenir.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath("/yonetim/personel");
  return { ok: true };
}
