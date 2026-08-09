"use server";

import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  imageAltSchema,
  reorderImageSchema,
  reorderImagesSchema,
  deleteChildSchema,
} from "@/lib/schemas/adminVilla";
import { processImage } from "@/lib/images/process";
import { MAX_UPLOAD_BYTES } from "@/lib/images/limits";
import { revalidateVilla } from "./revalidate";

export type ImageResult =
  | { ok: true }
  | { ok: false; error: "auth" | "validation" | "toobig" | "type" | "generic" };

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

/**
 * Görsellerin tam sırasını yeniden yazar (sürükle-bırak ve "kapak yap").
 * İstemciden gelen id listesi, villanın gerçek görselleriyle eşleşmezse
 * reddedilir — eksik/fazla id ile sıra bozulmasın.
 */
export async function reorderImages(input: unknown): Promise<ImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = reorderImagesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { villaId, orderedIds } = parsed.data;

  const supabase = await supabaseSession();
  const { data: imgs } = await supabase
    .from("villa_images")
    .select("id")
    .eq("villa_id", villaId);
  if (!imgs) return { ok: false, error: "generic" };

  // Gelen liste villanın görsellerinin tam kümesi olmalı.
  const actual = new Set(imgs.map((i) => i.id));
  if (
    orderedIds.length !== actual.size ||
    !orderedIds.every((id) => actual.has(id))
  ) {
    return { ok: false, error: "validation" };
  }

  // sort_order = dizideki konum. Sıra sitedeki galeri sırasını belirler.
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("villa_images")
      .update({ sort_order: i })
      .eq("id", orderedIds[i])
      .eq("villa_id", villaId);
    if (error) return { ok: false, error: "generic" };
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

/**
 * Birden çok görseli tek seferde siler (toplu seçim). Yalnızca verilen villaya
 * ait id'ler silinir — istemciden gelen id'ler doğrulanır. DB kaydı ve Storage
 * dosyası birlikte temizlenir.
 */
export async function deleteImages(input: {
  villaId: string;
  ids: string[];
}): Promise<ImageResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };
  if (
    !input.villaId ||
    !Array.isArray(input.ids) ||
    input.ids.length === 0
  ) {
    return { ok: false, error: "validation" };
  }

  const supabase = await supabaseSession();
  // Silinecek satırların yolları — yalnızca bu villaya ait olanlar.
  const { data: rows, error: selErr } = await supabase
    .from("villa_images")
    .select("id, storage_path")
    .eq("villa_id", input.villaId)
    .in("id", input.ids);
  if (selErr) return { ok: false, error: "generic" };
  const validIds = (rows ?? []).map((r) => r.id as string);
  if (validIds.length === 0) return { ok: false, error: "validation" };

  const { error: delErr } = await supabase
    .from("villa_images")
    .delete()
    .eq("villa_id", input.villaId)
    .in("id", validIds);
  if (delErr) return { ok: false, error: "generic" };

  const paths = (rows ?? [])
    .map((r) => r.storage_path as string)
    .filter((p) => p && !p.startsWith("http"));
  if (paths.length > 0) {
    await supabase.storage.from("villa-images").remove(paths);
  }

  await revalidateVilla(supabase, input.villaId);
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
