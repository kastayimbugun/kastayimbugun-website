"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  imageAltSchema,
  reorderImageSchema,
  deleteChildSchema,
} from "@/lib/schemas/adminVilla";
import { processImage } from "@/lib/images/process";
import { MAX_UPLOAD_BYTES } from "@/lib/images/limits";
import type { SupabaseClient } from "@supabase/supabase-js";

export type ImageResult =
  | { ok: true }
  | { ok: false; error: "auth" | "validation" | "toobig" | "type" | "generic" };

async function revalidateVilla(supabase: SupabaseClient, villaId: string) {
  const { data } = await supabase
    .from("villas")
    .select("slug")
    .eq("id", villaId)
    .maybeSingle();
  revalidatePath(`/yonetim/villalar/${villaId}`);
  if (data?.slug) revalidatePath(`/villa/${data.slug}`);
  revalidatePath("/", "layout");
}

/** Görsel yükler (Storage) ve villa_images kaydı oluşturur. FormData: villaId, file. */
export async function uploadImage(formData: FormData): Promise<ImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const villaId = String(formData.get("villaId") ?? "");
  const file = formData.get("file");
  if (!villaId || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "validation" };
  }
  if (!file.type.startsWith("image/")) return { ok: false, error: "type" };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "toobig" };

  // Yayına hazırla: 2000px WebP, EXIF (konum dahil) temizlenir.
  // Aynı zamanda dosyanın gerçekten görsel olduğunun kanıtı — uzantıya güvenmiyoruz.
  const processed = await processImage(file);
  if (!processed) return { ok: false, error: "type" };

  const supabase = await supabaseSession();

  // slug + mevcut en yüksek sıra
  const { data: villa } = await supabase
    .from("villas")
    .select("slug")
    .eq("id", villaId)
    .maybeSingle();
  if (!villa) return { ok: false, error: "validation" };

  const { data: last } = await supabase
    .from("villa_images")
    .select("sort_order")
    .eq("villa_id", villaId)
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextOrder = (last?.[0]?.sort_order ?? -1) + 1;

  const path = `villalar/${villa.slug}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${processed.ext}`;

  const { error: upErr } = await supabase.storage
    .from("villa-images")
    .upload(path, processed.buffer, {
      contentType: processed.contentType,
      upsert: false,
    });
  if (upErr) return { ok: false, error: "generic" };

  const { error: rowErr } = await supabase.from("villa_images").insert({
    villa_id: villaId,
    storage_path: path,
    sort_order: nextOrder,
    width: processed.width,
    height: processed.height,
  });
  if (rowErr) {
    // kayıt başarısızsa yüklenen dosyayı geri al
    await supabase.storage.from("villa-images").remove([path]);
    return { ok: false, error: "generic" };
  }

  await revalidateVilla(supabase, villaId);
  return { ok: true };
}

export async function deleteImage(input: {
  id: string;
  villaId: string;
  storagePath: string;
}): Promise<ImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = deleteChildSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_images")
    .delete()
    .eq("id", parsed.data.id)
    .eq("villa_id", parsed.data.villaId);
  if (error) return { ok: false, error: "generic" };

  // Storage'daki dosyayı da sil (harici URL değilse)
  if (input.storagePath && !input.storagePath.startsWith("http")) {
    await supabase.storage.from("villa-images").remove([input.storagePath]);
  }

  await revalidateVilla(supabase, parsed.data.villaId);
  return { ok: true };
}

export async function updateImageAlt(input: unknown): Promise<ImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = imageAltSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("villa_images")
    .update({ alt_tr: parsed.data.altTr, alt_en: parsed.data.altTr })
    .eq("id", parsed.data.id)
    .eq("villa_id", parsed.data.villaId);
  if (error) return { ok: false, error: "generic" };

  await revalidateVilla(supabase, parsed.data.villaId);
  return { ok: true };
}

/** Görseli bir sıra yukarı/aşağı taşır (komşuyla sort_order takas eder). */
export async function reorderImage(input: unknown): Promise<ImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = reorderImageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { id, villaId, direction } = parsed.data;

  const supabase = await supabaseSession();
  const { data: imgs } = await supabase
    .from("villa_images")
    .select("id, sort_order")
    .eq("villa_id", villaId)
    .order("sort_order");
  if (!imgs) return { ok: false, error: "generic" };

  const idx = imgs.findIndex((i) => i.id === id);
  if (idx === -1) return { ok: false, error: "validation" };
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= imgs.length) return { ok: true }; // uçta, işlem yok

  const a = imgs[idx];
  const b = imgs[swapIdx];
  // sort_order takası
  await supabase
    .from("villa_images")
    .update({ sort_order: b.sort_order })
    .eq("id", a.id);
  await supabase
    .from("villa_images")
    .update({ sort_order: a.sort_order })
    .eq("id", b.id);

  await revalidateVilla(supabase, villaId);
  return { ok: true };
}
