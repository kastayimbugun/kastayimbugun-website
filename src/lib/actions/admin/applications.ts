"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  updateApplicationStatusSchema,
  applicationNoteSchema,
  archiveApplicationSchema,
  createQuestionSchema,
  updateQuestionSchema,
  reorderQuestionSchema,
  toggleQuestionSchema,
  deleteQuestionSchema,
} from "@/lib/schemas/villaApplication";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";

export type ActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "auth" | "validation" | "generic";
      fields?: Record<string, string>;
    };

const LIST = "/yonetim/villa-basvurulari";

/* --------------------------------------------------------------- başvurular */

/** Başvuru durumunu değiştirir. */
export async function updateApplicationStatus(
  input: unknown
): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateApplicationStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { id, status } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_applications")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath(LIST);
  revalidatePath(`${LIST}/${id}`);
  revalidatePath("/yonetim");
  return { ok: true };
}

/** Başvuruya iç not yazar. */
export async function updateApplicationNote(
  input: unknown
): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = applicationNoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const { id, adminNote } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_applications")
    .update({ admin_note: adminNote, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath(`${LIST}/${id}`);
  return { ok: true };
}

/**
 * Başvuruyu arşivler (soft delete — docs/panel-kurallari.md §3). Kayıt ve
 * fotoğraflar korunur; yalnızca listeden çıkar.
 */
export async function archiveApplication(input: unknown): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = archiveApplicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_applications")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath(LIST);
  revalidatePath(`${LIST}/${parsed.data.id}`);
  revalidatePath("/yonetim");
  return { ok: true };
}

/**
 * Başvuruyu KALICI siler ve fotoğraflarını storage'dan temizler. Arşivlemeden
 * farklı olarak geri alınamaz — PII'yi tümüyle kaldırmak istendiğinde kullanılır.
 */
export async function deleteApplication(input: unknown): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = archiveApplicationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { id } = parsed.data;

  const supabase = await supabaseSession();

  const { data: row } = await supabase
    .from("villa_applications")
    .select("photo_paths")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase
    .from("villa_applications")
    .delete()
    .eq("id", id);
  if (error) return { ok: false, error: "generic" };

  const paths = ((row?.photo_paths as string[] | null) ?? []).filter(
    (p) => p && !p.startsWith("http")
  );
  if (paths.length > 0) {
    await supabase.storage.from("villa-applications").remove(paths);
  }

  revalidatePath(LIST);
  revalidatePath("/yonetim");
  return { ok: true };
}

/* ------------------------------------------------------------------ sorular */

const QUESTIONS = "/yonetim/villa-basvurulari/sorular";

/** Zod camelCase options → DB jsonb (value/label_tr/label_en). */
function optionsToDb(
  options: Array<{ value: string; labelTr: string; labelEn: string }>
) {
  return options.map((o) => ({
    value: o.value,
    label_tr: o.labelTr,
    label_en: o.labelEn,
  }));
}

/** Benzersiz qkey ihlalini alan hatasına çevirir. */
function isUniqueViolation(err: { code?: string } | null): boolean {
  return err?.code === "23505";
}

export async function createQuestion(input: unknown): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = createQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;

  const supabase = await supabaseSession();

  // Sıra: mevcut en yüksek + 10 (sona ekle).
  const { data: last } = await supabase
    .from("villa_application_questions")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = ((last?.[0]?.sort_order as number | undefined) ?? 0) + 10;

  const { error } = await supabase.from("villa_application_questions").insert({
    qkey: d.qkey,
    label_tr: d.labelTr,
    label_en: d.labelEn,
    help_tr: d.helpTr,
    help_en: d.helpEn,
    type: d.type,
    options: d.type === "select" ? optionsToDb(d.options) : [],
    required: d.required,
    active: d.active,
    sort_order: nextOrder,
  });

  if (error) {
    if (isUniqueViolation(error)) {
      return {
        ok: false,
        error: "validation",
        fields: { qkey: "Bu anahtar zaten kullanılıyor" },
      };
    }
    return { ok: false, error: "generic" };
  }

  revalidatePath(QUESTIONS);
  revalidatePath("/villa-basvurusu");
  return { ok: true };
}

export async function updateQuestion(input: unknown): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateQuestionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;

  const supabase = await supabaseSession();
  // qkey DEĞİŞTİRİLMEZ (mevcut cevaplar buna bağlı) — güncellemeye dahil edilmez.
  const { error } = await supabase
    .from("villa_application_questions")
    .update({
      label_tr: d.labelTr,
      label_en: d.labelEn,
      help_tr: d.helpTr,
      help_en: d.helpEn,
      type: d.type,
      options: d.type === "select" ? optionsToDb(d.options) : [],
      required: d.required,
      active: d.active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", d.id);

  if (error) return { ok: false, error: "generic" };

  revalidatePath(QUESTIONS);
  revalidatePath("/villa-basvurusu");
  return { ok: true };
}

/** Soruyu bir sıra yukarı/aşağı taşır (komşuyla sort_order takas eder). */
export async function reorderQuestion(input: unknown): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = reorderQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { id, direction } = parsed.data;

  const supabase = await supabaseSession();
  const { data: rows } = await supabase
    .from("villa_application_questions")
    .select("id, sort_order")
    .order("sort_order", { ascending: true });
  if (!rows) return { ok: false, error: "generic" };

  const idx = rows.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: false, error: "validation" };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return { ok: true }; // uçta

  const a = rows[idx];
  const b = rows[swapIdx];
  await supabase
    .from("villa_application_questions")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  await supabase
    .from("villa_application_questions")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);

  revalidatePath(QUESTIONS);
  revalidatePath("/villa-basvurusu");
  return { ok: true };
}

export async function toggleQuestionActive(
  input: unknown
): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = toggleQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_application_questions")
    .update({ active: parsed.data.active, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath(QUESTIONS);
  revalidatePath("/villa-basvurusu");
  return { ok: true };
}

/**
 * Soruyu kalıcı siler. Mevcut başvuruların answers'ındaki eski cevaplar veride
 * kalır (etiketsiz görünmez olur) — bu bilinçli; geçmiş bozulmaz.
 */
export async function deleteQuestion(input: unknown): Promise<ActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = deleteQuestionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_application_questions")
    .delete()
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath(QUESTIONS);
  revalidatePath("/villa-basvurusu");
  return { ok: true };
}
