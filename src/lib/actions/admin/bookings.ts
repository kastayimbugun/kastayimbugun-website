"use server";

import { revalidatePath } from "next/cache";
import { getStaffUser } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  updateBookingStatusSchema,
  updateBookingSchema,
  bookingPaymentSchema,
  bookingNoteSchema,
  manualBookingSchema,
} from "@/lib/schemas/adminBooking";
import { cancelReservationSchema } from "@/lib/schemas/adminVilla";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";

export type BookingActionResult =
  | { ok: true }
  | {
      ok: false;
      error: "auth" | "validation" | "conflict" | "generic";
      fields?: Record<string, string>;
    };

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
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }
  const { id, status, lostReason } = parsed.data;

  const supabase = await supabaseSession();

  // Mevcut talebi çek (villa + tarihler + eski durum)
  const { data: booking, error: readErr } = await supabase
    .from("booking_requests")
    .select(
      "villa_id, check_in, check_out, status, first_response_at, villas ( slug )"
    )
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

  // Durumu güncelle. `lost_reason` yalnızca "lost" durumunda dolu kalır —
  // DB'de de aynı kısıt var (0006 migration).
  const patch: Record<string, unknown> = {
    status,
    lost_reason: status === "lost" ? lostReason : null,
  };

  // Yanıt süresi ölçümü (yol haritası 2.4): talep "Yeni"den ilk kez çıktığı an
  // damgalanır. Sonraki durum değişimleri damgayı bozmaz.
  if (booking.status === "new" && status !== "new" && !booking.first_response_at) {
    patch.first_response_at = new Date().toISOString();
  }

  const { error: updErr } = await supabase
    .from("booking_requests")
    .update(patch)
    .eq("id", id);

  if (updErr) return { ok: false, error: "generic" };

  revalidatePath("/yonetim/talepler");
  revalidatePath("/yonetim/rezervasyonlar");
  revalidatePath(`/yonetim/talepler/${id}`);
  revalidatePath("/yonetim");
  if (slug) revalidatePath(`/villa/${slug}`);
  return { ok: true };
}

/**
 * Talep detayındaki alanların tümünü günceller (villa, tarih, kişi, misafir
 * bilgileri, tutar/ödeme).
 *
 * KRİTİK: onaylı bir kaydın villası ya da tarihleri değişirse takvimdeki blok
 * da taşınmalı. Taşınmazsa eski tarihler kapalı kalır, yeni tarihler açık
 * görünür → aynı tarihe ikinci onay verilebilir (çift rezervasyon).
 * Sıra bilerek "önce sil, sonra ekle": aralık kendi eski bloğuyla kesişiyorsa
 * (ör. 26–31 → 27–31) GIST kısıtı kendi kaydına takılırdı. Ekleme başarısız
 * olursa eski blok geri yazılır, tarih boşta kalmaz.
 */
export async function updateBooking(
  input: unknown
): Promise<BookingActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateBookingSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }
  const d = parsed.data;

  const supabase = await supabaseSession();

  const { data: current, error: readErr } = await supabase
    .from("booking_requests")
    .select("villa_id, check_in, check_out, status")
    .eq("id", d.id)
    .maybeSingle();
  if (readErr || !current) return { ok: false, error: "generic" };

  const isConfirmed = current.status === "confirmed";
  const moved =
    current.villa_id !== d.villaId ||
    current.check_in !== d.checkIn ||
    current.check_out !== d.checkOut;

  const oldBlock = {
    villa_id: current.villa_id as string,
    starts_on: current.check_in as string,
    ends_on: current.check_out as string,
    source: "booking",
  };

  if (isConfirmed && moved && current.villa_id) {
    await supabase
      .from("villa_blocks")
      .delete()
      .eq("villa_id", oldBlock.villa_id)
      .eq("starts_on", oldBlock.starts_on)
      .eq("ends_on", oldBlock.ends_on)
      .eq("source", "booking");

    const { error: blockErr } = await supabase.from("villa_blocks").insert({
      villa_id: d.villaId,
      starts_on: d.checkIn,
      ends_on: d.checkOut,
      source: "booking",
      note: "Onaylanan rezervasyon (düzenlendi)",
    });

    if (blockErr) {
      // Yeni aralık dolu: eski bloğu geri koy, kayıt olduğu gibi kalsın.
      await supabase
        .from("villa_blocks")
        .insert({ ...oldBlock, note: "Onaylanan rezervasyon talebi" });
      if (blockErr.code === "23P01") return { ok: false, error: "conflict" };
      return { ok: false, error: "generic" };
    }
  }

  const { error } = await supabase
    .from("booking_requests")
    .update({
      villa_id: d.villaId,
      check_in: d.checkIn,
      check_out: d.checkOut,
      adults: d.adults,
      children: d.children,
      babies: d.babies,
      full_name: d.fullName,
      phone: d.phone,
      email: d.email,
      price_estimate: d.priceEstimate,
      paid_amount: d.paidAmount,
      damage_deposit: d.damageDeposit,
      deposit_note: d.depositNote,
      note: d.note,
    })
    .eq("id", d.id);

  if (error) return { ok: false, error: "generic" };

  revalidatePath("/yonetim/talepler");
  revalidatePath("/yonetim/rezervasyonlar");
  revalidatePath(`/yonetim/talepler/${d.id}`);
  revalidatePath(`/yonetim/talepler/${d.id}/konfirmasyon`);
  revalidatePath(`/yonetim/villalar/${d.villaId}`);
  return { ok: true };
}

/**
 * Arama notu ekler ve isteğe bağlı olarak bir sonraki takip zamanını yazar.
 * Notlar silinmez: personel değişiminde geçmişin bütünlüğü korunsun diye
 * (docs/panel-kurallari.md §3, kalıcı silme yok).
 */
export async function addBookingNote(
  input: unknown
): Promise<BookingActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = bookingNoteSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "validation",
      fields: toFieldErrors(parsed.error),
    };
  }
  const { bookingId, body, followUpAt } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase.from("booking_notes").insert({
    booking_id: bookingId,
    author_id: staff.id,
    body,
  });
  if (error) return { ok: false, error: "generic" };

  // `datetime-local` saat dilimsiz gelir. Türkiye 2016'dan beri sabit UTC+3
  // (yaz saati yok), bu yüzden ofset doğrudan eklenebiliyor.
  if (followUpAt !== undefined) {
    await supabase
      .from("booking_requests")
      .update({
        next_follow_up_at: followUpAt ? `${followUpAt}:00+03:00` : null,
      })
      .eq("id", bookingId);
  }

  revalidatePath(`/yonetim/talepler/${bookingId}`);
  revalidatePath("/yonetim/talepler");
  return { ok: true };
}

/**
 * Villa takviminden bir tarih aralığındaki onaylı rezervasyonu iptal eder ve
 * tarihleri açar. İlgili talebi 'cancelled' yapar (veri tutarlılığı) ve
 * booking bloğunu kaldırır.
 */
export async function cancelReservation(
  input: unknown
): Promise<BookingActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = cancelReservationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };
  const { villaId, startsOn, endsOn } = parsed.data;

  const supabase = await supabaseSession();

  // Eşleşen onaylı talebi iptale çevir (varsa)
  const { data: booking } = await supabase
    .from("booking_requests")
    .select("id")
    .eq("villa_id", villaId)
    .eq("check_in", startsOn)
    .eq("check_out", endsOn)
    .eq("status", "confirmed")
    .maybeSingle();

  if (booking) {
    await supabase
      .from("booking_requests")
      .update({ status: "cancelled" })
      .eq("id", booking.id);
  }

  // Booking bloğunu kaldır (tarihleri aç)
  const { error } = await supabase
    .from("villa_blocks")
    .delete()
    .eq("villa_id", villaId)
    .eq("starts_on", startsOn)
    .eq("ends_on", endsOn)
    .eq("source", "booking");
  if (error) return { ok: false, error: "generic" };

  const { data: villa } = await supabase
    .from("villas")
    .select("slug")
    .eq("id", villaId)
    .maybeSingle();

  revalidatePath(`/yonetim/villalar/${villaId}`);
  revalidatePath("/yonetim/talepler");
  if (villa?.slug) revalidatePath(`/villa/${villa.slug}`);
  return { ok: true };
}

/**
 * Ödenen tutar / hasar depozitosu / ödeme notunu kaydeder. Ödeme kapıya
 * bağlı değil — acente banka transferiyle kapora alıyor, burada yalnızca
 * kaydı tutuluyor (kaspanel26'daki "Ödenmiş" / "Hasar Depozito" karşılığı).
 */
export async function updateBookingPayment(
  input: unknown
): Promise<BookingActionResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = bookingPaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const { id, paidAmount, damageDeposit, depositNote } = parsed.data;

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("booking_requests")
    .update({
      paid_amount: paidAmount,
      damage_deposit: damageDeposit,
      deposit_note: depositNote,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "generic" };

  revalidatePath("/yonetim/talepler");
  revalidatePath("/yonetim/rezervasyonlar");
  revalidatePath(`/yonetim/talepler/${id}/konfirmasyon`);
  return { ok: true };
}

export type ManualBookingResult =
  | { ok: true; id: string }
  | {
      ok: false;
      error: "auth" | "validation" | "conflict" | "generic";
      fields?: Record<string, string>;
    };

/**
 * Panelden doğrudan (telefonla gelen) rezervasyon girişi — talep aşamasını
 * atlar, kayıt doğrudan `confirmed` olarak açılır ve villa takvimi hemen
 * kapanır. Kaspanel26'daki manuel rezervasyon girişinin karşılığı.
 *
 * İki yazma tek işlem gibi ele alınır (docs/panel-kurallari.md §3, "çok
 * adımlı işlemler atomik"): `villa_blocks` çakışma yüzünden başarısız olursa
 * az önce oluşturulan talep de geri silinir — tutarsız/yetim kayıt kalmaz.
 */
export async function createManualBooking(
  input: unknown
): Promise<ManualBookingResult> {
  const staff = await getStaffUser();
  if (!staff) return { ok: false, error: "auth" };

  const parsed = manualBookingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const d = parsed.data;

  const supabase = await supabaseSession();

  const { data: row, error: insErr } = await supabase
    .from("booking_requests")
    .insert({
      villa_id: d.villaId,
      check_in: d.checkIn,
      check_out: d.checkOut,
      adults: d.adults,
      children: d.children,
      babies: d.babies,
      full_name: d.fullName,
      phone: d.phone,
      email: d.email,
      note: d.note,
      price_estimate: d.priceEstimate,
      paid_amount: d.paidAmount,
      damage_deposit: d.damageDeposit,
      status: "confirmed",
      source: "panel-manual",
    })
    .select("id")
    .single();

  if (insErr || !row) return { ok: false, error: "generic" };

  const { error: blockErr } = await supabase.from("villa_blocks").insert({
    villa_id: d.villaId,
    starts_on: d.checkIn,
    ends_on: d.checkOut,
    source: "booking",
    note: "Panelden manuel eklenen rezervasyon",
  });

  if (blockErr) {
    // Talep zaten yazıldı ama takvim kapatılamadı — yetim kayıt bırakma.
    await supabase.from("booking_requests").delete().eq("id", row.id);
    if (blockErr.code === "23P01") return { ok: false, error: "conflict" };
    return { ok: false, error: "generic" };
  }

  const { data: villa } = await supabase
    .from("villas")
    .select("slug")
    .eq("id", d.villaId)
    .maybeSingle();

  revalidatePath("/yonetim/rezervasyonlar");
  revalidatePath("/yonetim/talepler");
  revalidatePath(`/yonetim/villalar/${d.villaId}`);
  if (villa?.slug) revalidatePath(`/villa/${villa.slug}`);
  return { ok: true, id: row.id };
}
