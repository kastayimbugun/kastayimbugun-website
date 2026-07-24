"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import { updateBookingStatusSchema } from "@/lib/schemas/adminBooking";

export type BookingActionResult =
  | { ok: true }
  | { ok: false; error: "auth" | "validation" | "conflict" | "generic" };

/**
 * Talep durumunu değiştirir. "confirmed" olunca ilgili tarihleri villa takviminde
 * otomatik kapatır; onaydan çıkınca bu bloğu kaldırır (docs/panel-kurallari.md §3).
 *
 * GÜVENLİK: ilk satırda yetki kontrolü (Katman 3); işlem oturumlu istemciyle
 * yapılır, RLS devrede (Katman 4).
 */
export async function updateBookingStatus(
  input: unknown
): Promise<BookingActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateBookingStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { id, status } = parsed.data;

  const supabase = await supabaseSession();

  // Mevcut talebi çek (villa + tarihler + eski durum)
  const { data: booking, error: readErr } = await supabase
    .from("booking_requests")
    .select("villa_id, check_in, check_out, status, villas ( slug )")
    .eq("id", id)
    .maybeSingle();

  if (readErr || !booking) return { ok: false, error: "generic" };

  const villaId = booking.villa_id as string | null;
  const slug =
    (booking.villas as unknown as { slug: string } | null)?.slug ?? null;
  const wasConfirmed = booking.status === "confirmed";
  const willConfirm = status === "confirmed";

  // Onaya geçiş: tarihleri kapat (GIST çakışma engeli DB'de)
  if (willConfirm && !wasConfirmed && villaId) {
    const { error: blockErr } = await supabase.from("villa_blocks").insert({
      villa_id: villaId,
      starts_on: booking.check_in,
      ends_on: booking.check_out,
      source: "booking",
      note: "Onaylanan rezervasyon talebi",
    });
    if (blockErr) {
      // 23P01 = exclusion_violation (tarihler zaten dolu)
      if (blockErr.code === "23P01") return { ok: false, error: "conflict" };
      return { ok: false, error: "generic" };
    }
  }

  // Onaydan çıkış: ilgili bloğu kaldır (tarihleri tekrar aç)
  if (wasConfirmed && !willConfirm && villaId) {
    await supabase
      .from("villa_blocks")
      .delete()
      .eq("villa_id", villaId)
      .eq("starts_on", booking.check_in)
      .eq("ends_on", booking.check_out)
      .eq("source", "booking");
  }

  // Durumu güncelle
  const { error: updErr } = await supabase
    .from("booking_requests")
    .update({ status })
    .eq("id", id);

  if (updErr) return { ok: false, error: "generic" };

  revalidatePath("/yonetim/talepler");
  if (slug) revalidatePath(`/villa/${slug}`);
  return { ok: true };
}
