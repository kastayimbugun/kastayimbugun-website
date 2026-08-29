"use server";

import { after } from "next/server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import { getVilla } from "@/lib/data/villas";
import { bookingRequestSchema } from "@/lib/schemas/booking";
import { calcPrice } from "@/lib/pricing";
import { rangeHasConflict } from "@/lib/availability";
import { businessToday, nightsBetween } from "@/lib/format";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { allowRequest } from "@/lib/security/rateLimit";
import { notifyBookingRequest } from "@/lib/email/bookingNotifications";

/**
 * Rezervasyon talebi oluşturma — herkese açık formun tek giriş noktası.
 *
 * GÜVENLİK (bkz. ARCHITECTURE.md §4, §5):
 * - booking_requests tablosuna anon INSERT yoktur; kayıt yalnızca buradan,
 *   service_role ile atılır. Bu yüzden tüm doğrulama BURADA yapılır.
 * - İstemciden gelen fiyata/villaya güvenilmez: villa DB'den taze çekilir,
 *   tutar sunucuda yeniden hesaplanır.
 */

export type BookingActionResult =
  | { ok: true; total: number }
  | {
      ok: false;
      error: "validation" | "dates" | "captcha" | "rate_limit" | "generic";
    };

export async function createBookingRequest(
  input: unknown
): Promise<BookingActionResult> {
  // 1) Şema doğrulaması
  const parsed = bookingRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation" };
  }
  const data = parsed.data;

  // 2) Spam koruması — anahtar tanımlıysa zorunlu, değilse uyarıyla atla
  const turnstileToken =
    typeof input === "object" && input !== null && "turnstileToken" in input
      ? String((input as { turnstileToken?: unknown }).turnstileToken ?? "")
      : "";
  if (!(await verifyTurnstile(turnstileToken))) {
    return { ok: false, error: "captcha" };
  }

  // 2b) Hız sınırı — aynı IP saatte en fazla 8 talep. Turnstile aşılsa bile
  // otomatik gönderim maliyeti (DB satırı + e-posta) sınırlı kalsın.
  if (!(await allowRequest("booking", { max: 8, windowMinutes: 60 }))) {
    return { ok: false, error: "rate_limit" };
  }

  // 3) Villayı DB'den taze çek (yalnızca yayınlanmış villa talep alır)
  const villa = await getVilla(data.villaSlug);
  if (!villa) {
    return { ok: false, error: "generic" };
  }

  // 4) Sunucu tarafı müsaitlik/kural kontrolü
  // Vercel UTC çalışıyor; işletme günü Europe/Istanbul. Sabitlenmezse gece
  // 00:00–03:00 arası sunucu "dün"ü bugün sanar (bkz. format.ts businessToday).
  const today = businessToday();
  const nights = nightsBetween(data.checkIn, data.checkOut);
  const guestsTotal = data.adults + data.children;

  if (
    data.checkIn < today ||
    nights < villa.minNights ||
    guestsTotal > villa.capacity ||
    rangeHasConflict(data.checkIn, data.checkOut, villa.bookedRanges)
  ) {
    return { ok: false, error: "dates" };
  }

  // 5) Fiyatı sunucuda hesapla (istemciden geleni kullanma)
  // Fiyat kuralları sunucuda uygulanır (kapasite üstü + son dakika için kişi
  // sayısı ve bugün gerekir). İstemcideki tutar sadece gösterim.
  const price = calcPrice(villa, data.checkIn, data.checkOut, {
    guests: guestsTotal,
    asOf: today,
  });

  // 6) villa_id'yi çöz ve kaydı yaz
  const admin = supabaseAdmin();
  const { data: villaRow } = await admin
    .from("villas")
    .select("id")
    .eq("slug", data.villaSlug)
    .maybeSingle();

  if (!villaRow) {
    return { ok: false, error: "generic" };
  }

  const { error } = await admin.from("booking_requests").insert({
    villa_id: villaRow.id,
    check_in: data.checkIn,
    check_out: data.checkOut,
    adults: data.adults,
    children: data.children,
    babies: data.babies,
    full_name: data.fullName,
    phone: data.phone,
    email: data.email || null,
    note: data.note || null,
    price_estimate: price.total,
    status: "new",
    source: "villa_detail",
  });

  if (error) {
    console.error("booking_requests insert hatası:", error.message);
    return { ok: false, error: "generic" };
  }

  // 7) Bildirimler — yanıtı bloklamaz (`after`, yanıt gönderildikten sonra çalışır).
  // Talep zaten kaydedildi; e-posta gitmese de sonucu değiştirmez.
  after(async () => {
    await notifyBookingRequest({
      villaName: villa.name,
      villaCode: villa.code,
      checkIn: data.checkIn,
      checkOut: data.checkOut,
      nights,
      adults: data.adults,
      children: data.children,
      babies: data.babies,
      fullName: data.fullName,
      phone: data.phone,
      email: data.email || undefined,
      note: data.note || undefined,
      total: price.total,
      lang: data.lang ?? "tr",
    });
  });

  return { ok: true, total: price.total };
}

