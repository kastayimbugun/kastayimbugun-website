import "server-only";
import { supabaseSession } from "@/lib/supabase/session";
import { safeTerm } from "./searchTerm";
import { mapQuestion, type ApplicationQuestion } from "@/lib/data/applicationQuestions";
import type { ApplicationStatus } from "@/lib/schemas/villaApplication";

/**
 * Villa başvurularının panel veri katmanı (docs/panel-kurallari.md §5).
 *
 * Oturumlu istemci → RLS yalnızca personele izin verir. PII (telefon/e-posta/
 * adres) yalnızca burada, panelde ve sayfa başına sınırlı görünür.
 */

export interface AdminApplication {
  id: string;
  ownerName: string;
  phone: string;
  email: string | null;
  villaName: string;
  location: string;
  status: ApplicationStatus;
  photoCount: number;
  coverUrl: string | null;
  createdAt: string;
}

export interface AdminApplicationDetail extends AdminApplication {
  address: string | null;
  description: string | null;
  answers: Record<string, string | number | boolean>;
  photoUrls: string[];
  adminNote: string | null;
  updatedAt: string;
}

interface Row {
  id: string;
  owner_name: string;
  phone: string;
  email: string | null;
  villa_name: string;
  location: string;
  address: string | null;
  description: string | null;
  answers: Record<string, string | number | boolean> | null;
  photo_paths: string[] | null;
  status: ApplicationStatus;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Başvuru fotoğrafları için İMZALI URL üretir (tek istekte, toplu).
 *
 * `villa-applications` bucket'ı 0024 ile gizliye alındı: eskiden public'ti ve
 * SELECT politikası koşulsuz olduğu için anon anahtarla listelenip toplu
 * indirilebiliyordu (villa sahibinin iç mekân fotoğrafları, açık adresle aynı
 * kayıtta). Artık yalnızca `applications` izni olan personel, süreli bir
 * bağlantı üzerinden görebilir.
 *
 * Süre 1 saat: panelde bir başvuruyu incelemeye fazlasıyla yeter, sızan bir
 * bağlantının ömrü ise sınırlı kalır.
 */
async function signedPhotoUrls(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  paths: string[]
): Promise<string[]> {
  const local = paths.filter((p) => p && !p.startsWith("http"));
  if (local.length === 0) return paths.map((p) => (p?.startsWith("http") ? p : ""));
  const { data } = await supabase.storage
    .from("villa-applications")
    .createSignedUrls(local, 60 * 60);
  const byPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl ?? ""]));
  return paths.map((p) =>
    p?.startsWith("http") ? p : (byPath.get(p) ?? "")
  );
}

export interface ApplicationFilters {
  status?: ApplicationStatus;
  q?: string;
  page?: number;
}

export interface ApplicationPage {
  rows: AdminApplication[];
  total: number;
  page: number;
  pageCount: number;
}

export const APPLICATIONS_PAGE_SIZE = 25;

const LIST_SELECT =
  "id, owner_name, phone, email, villa_name, location, photo_paths, status, created_at";

function withFilters(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  f: ApplicationFilters,
  select: string,
  options?: { count: "exact"; head: boolean }
) {
  let q = supabase.from("villa_applications").select(select, options);
  const term = f.q ? safeTerm(f.q) : "";
  if (term) {
    q = q.or(
      `owner_name.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,villa_name.ilike.%${term}%,location.ilike.%${term}%`
    );
  }
  return q;
}

/** Başvuruları filtreli ve sayfalı listeler. */
export async function getApplications(
  f: ApplicationFilters = {}
): Promise<ApplicationPage> {
  const supabase = await supabaseSession();
  const page = Math.max(1, Math.trunc(f.page ?? 1));
  const offset = (page - 1) * APPLICATIONS_PAGE_SIZE;

  let query = withFilters(supabase, f, LIST_SELECT, {
    count: "exact",
    head: false,
  });
  if (f.status) query = query.eq("status", f.status);
  query = query.order("created_at", { ascending: false });

  const { data, error, count } = await query.range(
    offset,
    offset + APPLICATIONS_PAGE_SIZE - 1
  );
  if (error) throw new Error(`Başvurular okunamadı: ${error.message}`);

  const total = count ?? 0;
  // Kapak görselleri tek toplu istekte imzalanır (satır başına ayrı istek değil).
  const list = data as unknown as Row[];
  const covers = await signedPhotoUrls(
    supabase,
    list.map((r) => (r.photo_paths ?? [])[0] ?? "")
  );
  const rows = list.map((r, i) => {
    const paths = r.photo_paths ?? [];
    return {
      id: r.id,
      ownerName: r.owner_name,
      phone: r.phone,
      email: r.email,
      villaName: r.villa_name,
      location: r.location,
      status: r.status,
      photoCount: paths.length,
      coverUrl: paths[0] ? (covers[i] || null) : null,
      createdAt: r.created_at,
    };
  });

  return {
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / APPLICATIONS_PAGE_SIZE)),
    rows,
  };
}

/** Durum başına başvuru sayıları (filtre sekmesi rozetleri). */
export async function getApplicationCounts(
  f: ApplicationFilters = {}
): Promise<Record<ApplicationStatus, number>> {
  const supabase = await supabaseSession();
  const statuses: ApplicationStatus[] = [
    "new",
    "contacted",
    "accepted",
    "rejected",
    "archived",
  ];

  const results = await Promise.all(
    statuses.map((s) =>
      withFilters(supabase, f, "id", { count: "exact", head: true }).eq(
        "status",
        s
      )
    )
  );

  const counts = {} as Record<ApplicationStatus, number>;
  statuses.forEach((s, i) => {
    const { error, count } = results[i];
    if (error) throw new Error(`Başvuru sayıları okunamadı: ${error.message}`);
    counts[s] = count ?? 0;
  });
  return counts;
}

/** Tek başvurunun tamamı (detay sayfası). */
export async function getApplication(
  id: string
): Promise<AdminApplicationDetail | null> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villa_applications")
    .select(
      "id, owner_name, phone, email, villa_name, location, address, description, answers, photo_paths, status, admin_note, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Başvuru okunamadı: ${error.message}`);
  if (!data) return null;

  const r = data as unknown as Row;
  const paths = r.photo_paths ?? [];
  const photoUrls = await signedPhotoUrls(supabase, paths);
  return {
    id: r.id,
    ownerName: r.owner_name,
    phone: r.phone,
    email: r.email,
    villaName: r.villa_name,
    location: r.location,
    address: r.address,
    description: r.description,
    answers: r.answers ?? {},
    photoUrls,
    photoCount: paths.length,
    coverUrl: photoUrls[0] || null,
    adminNote: r.admin_note,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

const QUESTION_SELECT =
  "id, qkey, label_tr, label_en, help_tr, help_en, type, options, required, sort_order, active";

/** Tüm sorular (pasifler dahil) — panel yönetimi ve cevap etiketleme için. */
export async function getAllQuestions(): Promise<ApplicationQuestion[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villa_application_questions")
    .select(QUESTION_SELECT)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Sorular okunamadı: ${error.message}`);
  return (data as unknown as Parameters<typeof mapQuestion>[0][]).map(mapQuestion);
}
