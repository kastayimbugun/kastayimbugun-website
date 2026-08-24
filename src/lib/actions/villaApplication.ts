"use server";

import { after } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getActiveApplicationQuestions } from "@/lib/data/applicationQuestions";
import { applicationCoreSchema } from "@/lib/schemas/villaApplication";
import { processImage } from "@/lib/images/process";
import { MAX_UPLOAD_BYTES } from "@/lib/images/limits";
import { notifyVillaApplication } from "@/lib/email/villaApplicationNotifications";

/**
 * Villa sahibi başvurusu — herkese açık formun tek giriş noktası.
 *
 * GÜVENLİK (ARCHITECTURE.md §4, §5):
 * - villa_applications tablosuna anon INSERT yoktur; kayıt yalnızca buradan,
 *   service_role ile atılır. Tüm doğrulama BURADA yapılır.
 * - Fotoğraflar processImage'dan geçer (EXIF/GPS temizlenir, dosyanın gerçekten
 *   görsel olduğunun kanıtı) ve villa-applications bucket'ına yüklenir.
 * - Villa özelliklerinin ("kaç oda", "havuz" ...) cevapları panelden yönetilen
 *   AKTİF sorulara göre doğrulanır; anahtarlar dinamik olduğu için Zod değil,
 *   burada elle kontrol edilir.
 */

export type ApplicationActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "validation" | "photos" | "questions" | "captcha" | "generic";
    };

const MAX_PHOTOS = 15;
const MAX_ANSWER_LEN = 2000;

export async function createVillaApplication(
  formData: FormData
): Promise<ApplicationActionResult> {
  // 1) Çekirdek alanlar
  const core = applicationCoreSchema.safeParse({
    ownerName: str(formData, "ownerName"),
    phone: str(formData, "phone"),
    email: str(formData, "email"),
    villaName: str(formData, "villaName"),
    location: str(formData, "location"),
    address: str(formData, "address"),
    description: str(formData, "description"),
    lang: str(formData, "lang") || undefined,
  });
  if (!core.success) return { ok: false, error: "validation" };
  const data = core.data;

  // 2) Spam koruması (booking ile aynı; anahtar yoksa geliştirmede atlanır)
  if (!(await verifyTurnstile(str(formData, "turnstileToken")))) {
    return { ok: false, error: "captcha" };
  }

  // 3) Dinamik soruların cevaplarını doğrula/derle
  let questions;
  try {
    questions = await getActiveApplicationQuestions();
  } catch {
    return { ok: false, error: "generic" };
  }

  const answers: Record<string, string | number | boolean> = {};
  const answerLabels: Array<[string, string]> = []; // e-posta için

  for (const q of questions) {
    const raw = str(formData, `answer_${q.qkey}`);

    if (q.type === "boolean") {
      // Evet/Hayır her zaman bir cevaptır (işaretli değilse "hayır").
      const val = raw === "true" || raw === "on" || raw === "1";
      answers[q.qkey] = val;
      answerLabels.push([labelOf(q), val ? "Evet" : "Hayır"]);
      continue;
    }

    if (!raw) {
      if (q.required) return { ok: false, error: "questions" };
      continue; // opsiyonel ve boş → kaydetme
    }

    if (raw.length > MAX_ANSWER_LEN) return { ok: false, error: "questions" };

    if (q.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
        return { ok: false, error: "questions" };
      }
      answers[q.qkey] = n;
      answerLabels.push([labelOf(q), String(n)]);
    } else if (q.type === "select") {
      const opt = q.options.find((o) => o.value === raw);
      if (!opt) return { ok: false, error: "questions" };
      answers[q.qkey] = raw;
      answerLabels.push([labelOf(q), opt.labelTr]);
    } else {
      // text / textarea
      answers[q.qkey] = raw;
      answerLabels.push([labelOf(q), raw]);
    }
  }

  // 4) Fotoğraflar — en az 1 zorunlu, işlenip yüklenir
  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);

  if (files.length === 0) return { ok: false, error: "photos" };
  if (files.length > MAX_PHOTOS) return { ok: false, error: "photos" };

  const admin = supabaseAdmin();
  const folder = crypto.randomUUID();
  const uploadedPaths: string[] = [];

  for (const file of files) {
    if (!file.type.startsWith("image/") || file.size > MAX_UPLOAD_BYTES) {
      await cleanup(admin, uploadedPaths);
      return { ok: false, error: "photos" };
    }
    const processed = await processImage(file);
    if (!processed) {
      await cleanup(admin, uploadedPaths);
      return { ok: false, error: "photos" };
    }

    const path = `basvurular/${folder}/${uploadedPaths.length}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${processed.ext}`;

    const { error: upErr } = await admin.storage
      .from("villa-applications")
      .upload(path, processed.buffer, {
        contentType: processed.contentType,
        upsert: false,
      });
    if (upErr) {
      await cleanup(admin, uploadedPaths);
      return { ok: false, error: "generic" };
    }
    uploadedPaths.push(path);
  }

  // 5) Kaydı yaz
  const { error: insErr } = await admin.from("villa_applications").insert({
    owner_name: data.ownerName,
    phone: data.phone,
    email: data.email || null,
    villa_name: data.villaName,
    location: data.location,
    address: data.address || null,
    description: data.description || null,
    answers,
    photo_paths: uploadedPaths,
    status: "new",
    source: "home_cta",
  });

  if (insErr) {
    console.error("villa_applications insert hatası:", insErr.message);
    await cleanup(admin, uploadedPaths);
    return { ok: false, error: "generic" };
  }

  // 6) Bildirim — yanıtı bloklamaz (`after`). Başvuru zaten kaydedildi.
  after(async () => {
    await notifyVillaApplication({
      ownerName: data.ownerName,
      phone: data.phone,
      email: data.email || undefined,
      villaName: data.villaName,
      location: data.location,
      address: data.address || undefined,
      description: data.description || undefined,
      answers: answerLabels,
      photoCount: uploadedPaths.length,
    });
  });

  return { ok: true };
}

/* ---------------------------------------------------------------- yardımcı */

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

function labelOf(q: { labelTr: string }): string {
  return q.labelTr;
}

/** Kayıt/yükleme yarıda kalırsa yüklenen dosyaları geri al (yetim dosya bırakma). */
async function cleanup(
  admin: ReturnType<typeof supabaseAdmin>,
  paths: string[]
): Promise<void> {
  if (paths.length > 0) {
    await admin.storage.from("villa-applications").remove(paths);
  }
}

/** Cloudflare Turnstile doğrulaması. Anahtar yoksa geliştirmede atlanır. */
async function verifyTurnstile(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.warn(
      "TURNSTILE_SECRET_KEY tanımlı değil — spam koruması atlanıyor (yalnızca geliştirme)."
    );
    return true;
  }
  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret, response: token }),
      }
    );
    const body = (await res.json()) as { success: boolean };
    return body.success === true;
  } catch {
    return false;
  }
}
