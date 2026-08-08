import "server-only";

import type { Lang } from "@/lib/i18n";
import { formatDate, formatPrice } from "@/lib/format";
import { getSiteSettings, type SiteSettings } from "@/lib/data/site";
import { escapeHtml, sendEmail, siteUrl } from "./send";

/**
 * Rezervasyon talebi bildirimleri (PLAN.md Faz 4.4).
 *
 * İki e-posta:
 *  - Acenteye "yeni talep" bildirimi (her zaman, Türkçe — panel gibi iç araç)
 *  - Misafire "talebiniz alındı" onayı (yalnızca e-posta verdiyse, kendi dilinde)
 *
 * Metinler neden `i18n.tsx` sözlüğünde değil (ARCHITECTURE.md §7 istisnası):
 * o dosya `"use client"` bir React context'i, sunucudan çağrılamaz. E-posta
 * gövdeleri yalnızca burada üretildiği için sözlük dosya içinde tutuluyor.
 */

export type BookingNotificationInput = {
  villaName: string;
  villaCode?: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  adults: number;
  children: number;
  babies: number;
  fullName: string;
  phone: string;
  email?: string;
  note?: string;
  /** Sunucuda hesaplanan tahmini tutar. */
  total: number;
  /** Misafirin sitede kullandığı dil — yalnızca misafire giden e-postayı etkiler. */
  lang: Lang;
};

/**
 * Talep kaydı yazıldıktan sonra çağrılır. Hiçbir koşulda hata fırlatmaz;
 * bildirim gitmese de talep geçerlidir.
 */
export async function notifyBookingRequest(
  input: BookingNotificationInput
): Promise<void> {
  const agencyTo = process.env.BOOKING_NOTIFY_EMAIL;

  if (agencyTo) {
    const mail = agencyMail(input);
    await sendEmail({
      to: agencyTo,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      // Acente doğrudan "Yanıtla" diyerek misafire dönebilsin.
      replyTo: input.email || undefined,
    });
  } else {
    console.warn(
      "BOOKING_NOTIFY_EMAIL tanımlı değil — acenteye talep bildirimi gönderilmedi."
    );
  }

  if (input.email) {
    // Misafire giden postanın altbilgisi panelden yönetiliyor; okuma `after`
    // içinde olduğu için yanıtı geciktirmez.
    const settings = await getSiteSettings();
    const mail = guestMail(input, settings);
    await sendEmail({
      to: input.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
  }
}

/* ---------------------------------------------------------------- şablonlar */

type RenderedMail = { subject: string; html: string; text: string };

function agencyMail(input: BookingNotificationInput): RenderedMail {
  const dates = `${formatDate(input.checkIn)} → ${formatDate(input.checkOut)}`;
  const villaLabel = input.villaCode
    ? `${input.villaName} (${input.villaCode})`
    : input.villaName;

  const rows: Array<[string, string]> = [
    ["Villa", villaLabel],
    ["Tarih", `${dates} · ${input.nights} gece`],
    ["Misafir", input.fullName],
    ["Telefon", input.phone],
    ["E-posta", input.email || "—"],
    ["Kişi", guestCountLabel(input, "tr")],
    ["Tahmini tutar", formatPrice(input.total)],
  ];

  if (input.note) rows.push(["Not", input.note]);

  const panelUrl = siteUrl() ? `${siteUrl()}/yonetim/talepler` : "";

  const html = shell({
    heading: "Yeni rezervasyon talebi",
    intro: `<strong>${escapeHtml(input.fullName)}</strong> ${escapeHtml(
      villaLabel
    )} için talep oluşturdu.`,
    rows,
    cta: panelUrl ? { href: panelUrl, label: "Panelde aç" } : undefined,
    footer:
      "Bu bildirim kastayimbugun.com rezervasyon formundan otomatik gönderildi.",
  });

  return {
    subject: `Yeni talep — ${villaLabel} · ${dates}`,
    html,
    text: textFrom(rows, panelUrl),
  };
}

function guestMail(
  input: BookingNotificationInput,
  settings: SiteSettings
): RenderedMail {
  const t = guestCopy[input.lang];
  const dates = `${formatDate(input.checkIn, input.lang)} → ${formatDate(
    input.checkOut,
    input.lang
  )}`;

  const rows: Array<[string, string]> = [
    [t.villa, input.villaName],
    [t.dates, `${dates} · ${input.nights} ${t.nights}`],
    [t.guests, guestCountLabel(input, input.lang)],
    [t.estimate, formatPrice(input.total, input.lang)],
  ];

  // Acente unvanı ve TÜRSAB numarası panelden gelir; girilmemişse şablondaki
  // varsayılan kullanılır (site ayarları henüz doldurulmamış olabilir).
  const footer = [
    settings.agencyName ?? t.agencyFallback,
    `TÜRSAB ${settings.tursabNo ?? "17305"}`,
  ].join(" · ");

  const html = shell({
    heading: t.heading,
    intro: `${escapeHtml(input.fullName)}, ${t.intro}`,
    rows,
    note: t.note,
    footer,
  });

  return {
    subject: `${t.subject} — ${input.villaName}`,
    html,
    text: textFrom(rows, ""),
  };
}

const guestCopy: Record<
  Lang,
  {
    subject: string;
    heading: string;
    intro: string;
    villa: string;
    dates: string;
    nights: string;
    guests: string;
    estimate: string;
    note: string;
    /** Panelde acente unvanı girilmemişse kullanılır. */
    agencyFallback: string;
  }
> = {
  tr: {
    subject: "Talebiniz alındı",
    heading: "Talebiniz bize ulaştı",
    intro: "rezervasyon talebiniz için teşekkür ederiz. Özet aşağıda:",
    villa: "Villa",
    dates: "Tarih",
    nights: "gece",
    guests: "Kişi",
    estimate: "Tahmini tutar",
    note: "Bu bir rezervasyon onayı değildir. Ekibimiz müsaitliği teyit edip en kısa sürede sizinle iletişime geçecek. Tutar tahminidir; kesin fiyat teyit sırasında paylaşılır.",
    agencyFallback: "Kaş Likya Turizm Seyahat Acentası",
  },
  en: {
    subject: "We received your request",
    heading: "Your request has reached us",
    intro: "thank you for your booking request. Here is a summary:",
    villa: "Villa",
    dates: "Dates",
    nights: "nights",
    guests: "Guests",
    estimate: "Estimated total",
    note: "This is not a booking confirmation. Our team will verify availability and contact you shortly. The amount shown is an estimate; the final price is confirmed during that contact.",
    agencyFallback: "Kaş Likya Turizm Travel Agency",
  },
};

function guestCountLabel(input: BookingNotificationInput, lang: Lang): string {
  const words =
    lang === "tr"
      ? { adults: "yetişkin", children: "çocuk", babies: "bebek" }
      : { adults: "adults", children: "children", babies: "babies" };

  const parts = [`${input.adults} ${words.adults}`];
  if (input.children > 0) parts.push(`${input.children} ${words.children}`);
  if (input.babies > 0) parts.push(`${input.babies} ${words.babies}`);
  return parts.join(", ");
}

/**
 * Ortak HTML iskeleti. E-posta istemcileri modern CSS'i güvenilir biçimde
 * uygulamadığı için stiller inline ve düzen tablo tabanlı tutuldu.
 */
function shell(opts: {
  heading: string;
  intro: string;
  rows: Array<[string, string]>;
  cta?: { href: string; label: string };
  note?: string;
  footer: string;
}): string {
  const rowsHtml = opts.rows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:14px;white-space:nowrap;vertical-align:top;">${escapeHtml(
            label
          )}</td>
          <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${escapeHtml(
            value
          )}</td>
        </tr>`
    )
    .join("");

  const ctaHtml = opts.cta
    ? `<p style="margin:24px 0 0;">
         <a href="${opts.cta.href}" style="display:inline-block;background:#0f766e;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600;">${escapeHtml(
           opts.cta.label
         )}</a>
       </p>`
    : "";

  const noteHtml = opts.note
    ? `<p style="margin:24px 0 0;padding:12px 14px;background:#f9fafb;border-radius:8px;color:#4b5563;font-size:13px;line-height:1.6;">${escapeHtml(
        opts.note
      )}</p>`
    : "";

  return `<!doctype html>
<html lang="tr">
  <body style="margin:0;padding:24px;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table role="presentation" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px;">
      <tr>
        <td>
          <h1 style="margin:0 0 12px;font-size:20px;color:#111827;">${escapeHtml(
            opts.heading
          )}</h1>
          <p style="margin:0 0 20px;color:#4b5563;font-size:15px;line-height:1.6;">${opts.intro}</p>
          <table role="presentation" style="width:100%;border-collapse:collapse;">
            ${rowsHtml}
          </table>
          ${ctaHtml}
          ${noteHtml}
          <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">${escapeHtml(
            opts.footer
          )}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** HTML görüntülenemeyen istemciler için düz metin karşılığı. */
function textFrom(rows: Array<[string, string]>, url: string): string {
  const body = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  return url ? `${body}\n\n${url}` : body;
}
