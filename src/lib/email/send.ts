import "server-only";

/**
 * Resend üzerinden e-posta gönderimi (ARCHITECTURE.md §2: yalnızca sunucu).
 *
 * Neden `resend` paketi değil de doğrudan REST: tek bir uç nokta kullanıyoruz
 * ve projedeki diğer dış servis çağrısı (Turnstile) zaten fetch ile yapılıyor.
 * Bağımlılık eklemeden aynı desen sürüyor.
 *
 * Gönderim ASLA çağıranı bozmaz — hata durumunda loglayıp `false` döner.
 * Rezervasyon talebi veritabanına yazıldıysa, e-posta gitmese de talep geçerlidir.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

/**
 * Resend'de doğrulanmış alan adı yokken kullanılabilen test göndericisi.
 * Bu adresle YALNIZCA Resend hesabının sahibi olan e-postaya gönderilebilir;
 * gerçek yayında `RESEND_FROM_EMAIL` doğrulanmış alan adıyla tanımlanmalı.
 */
const FALLBACK_FROM = "Kastayım Bugün <onboarding@resend.dev>";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Acenteye giden bildirimde misafirin adresi — "Yanıtla" doğrudan ona gitsin. */
  replyTo?: string;
};

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY tanımlı değil — e-posta gönderilmedi.");
    return false;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL || FALLBACK_FROM,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.replyTo ? { reply_to: input.replyTo } : {}),
      }),
    });

    if (!res.ok) {
      // ARCHITECTURE.md §5: PII loglanmaz — alıcı adresi ve içerik log'a girmez.
      const detail = await res.text().catch(() => "");
      console.error(
        `Resend gönderimi başarısız (HTTP ${res.status}).`,
        detail.slice(0, 200)
      );
      return false;
    }

    return true;
  } catch (err) {
    console.error(
      "Resend isteği atılamadı:",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}

/** Şablonlara gömülen kullanıcı girdisi için HTML kaçışı. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * E-postalardaki mutlak bağlantılar için site kökü.
 * Alan adı bağlanana kadar Vercel'in ürettiği production adresine düşer;
 * ikisi de yoksa boş döner ve şablonlar bağlantıyı hiç basmaz.
 */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : "";
}
