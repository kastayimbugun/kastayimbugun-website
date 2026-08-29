import { z } from "zod";
import { MODULE_KEYS } from "@/lib/auth/permissions";

/**
 * Personel yönetimi şemaları (yalnızca admin action'ları kullanır).
 * ARCHITECTURE.md §3: güven sınırında Zod. Şifreler burada yalnızca uzunluk
 * doğrulanır; asla loglanmaz/saklanmaz (Supabase Auth hash'ler).
 */

const roleSchema = z.enum(["admin", "editor"]);

// Modül anahtarı listesi — permissions.ts tek kaynağından türetilir.
const moduleKeySchema = z.enum(MODULE_KEYS);
const permissionsSchema = z.array(moduleKeySchema).max(MODULE_KEYS.length);

const emailSchema = z.email("Geçerli bir e-posta girin").max(160);
const passwordSchema = z
  .string()
  .min(8, "Şifre en az 8 karakter olmalı")
  .max(72, "Şifre en fazla 72 karakter");
const fullNameSchema = z
  .string()
  .trim()
  .min(2, "Ad soyad en az 2 karakter")
  .max(120, "Ad soyad çok uzun");

export const createStaffSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: fullNameSchema,
  role: roleSchema,
  permissions: permissionsSchema,
});

export const updateStaffSchema = z.object({
  id: z.uuid(),
  fullName: fullNameSchema,
  role: roleSchema,
  permissions: permissionsSchema,
});

export const resetPasswordSchema = z.object({
  id: z.uuid(),
  password: passwordSchema,
});

export const deleteStaffSchema = z.object({
  id: z.uuid(),
});

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
