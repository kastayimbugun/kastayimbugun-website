import "server-only";
import { supabaseServer } from "@/lib/supabase/server";
import type { QuestionType } from "@/lib/schemas/villaApplication";

/**
 * Villa başvuru formunun dinamik soruları (panelden yönetilir).
 *
 * ARCHITECTURE.md §1: Supabase'e yalnızca veri katmanından erişilir. Bu dosya
 * herkese açık form için AKTİF soruları okur (anon istemci → RLS "active or
 * is_staff()" izin verir). Panel tarafı (pasifler dahil) ayrı fonksiyondan
 * gelir (data/admin/applications.ts).
 */

export interface QuestionOption {
  value: string;
  labelTr: string;
  labelEn: string;
}

export interface ApplicationQuestion {
  id: string;
  qkey: string;
  labelTr: string;
  labelEn: string;
  helpTr: string | null;
  helpEn: string | null;
  type: QuestionType;
  options: QuestionOption[];
  required: boolean;
  sortOrder: number;
  active: boolean;
}

interface QuestionRow {
  id: string;
  qkey: string;
  label_tr: string;
  label_en: string;
  help_tr: string | null;
  help_en: string | null;
  type: QuestionType;
  options: unknown;
  required: boolean;
  sort_order: number;
  active: boolean;
}

/** DB satırını arayüz tipine çevirir (options jsonb → tiplenmiş dizi). */
export function mapQuestion(r: QuestionRow): ApplicationQuestion {
  const rawOptions = Array.isArray(r.options) ? r.options : [];
  const options: QuestionOption[] = rawOptions
    .map((o) => o as Record<string, unknown>)
    .filter((o) => typeof o?.value === "string")
    .map((o) => ({
      value: String(o.value),
      labelTr: String(o.label_tr ?? o.value),
      labelEn: String(o.label_en ?? o.label_tr ?? o.value),
    }));

  return {
    id: r.id,
    qkey: r.qkey,
    labelTr: r.label_tr,
    labelEn: r.label_en,
    helpTr: r.help_tr,
    helpEn: r.help_en,
    type: r.type,
    options,
    required: r.required,
    sortOrder: r.sort_order,
    active: r.active,
  };
}

const SELECT =
  "id, qkey, label_tr, label_en, help_tr, help_en, type, options, required, sort_order, active";

/** Formda gösterilecek aktif sorular (sırasıyla). */
export async function getActiveApplicationQuestions(): Promise<
  ApplicationQuestion[]
> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from("villa_application_questions")
    .select(SELECT)
    .eq("active", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Başvuru soruları okunamadı: ${error.message}`);
  return (data as unknown as QuestionRow[]).map(mapQuestion);
}
