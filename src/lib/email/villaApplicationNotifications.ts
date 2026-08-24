import "server-only";

import { escapeHtml, sendEmail, siteUrl } from "./send";

/**
 * Villa sahibi başvuru bildirimi (ana sayfa "Hemen Başvurun").
 *
 * Tek e-posta: acenteye "yeni villa başvurusu". Başvurana otomatik yanıt
 * gönderilmez — süreç telefonla yürüyor, başvuranın e-postası opsiyonel.
 *
 * Metinler neden i18n.tsx'te değil: o dosya "use client" React context'i,
 * sunucudan çağrılamaz (ARCHITECTURE.md §7 istisnası). Bildirim gövdesi
 * yalnızca burada üretiliyor.
 *
 * Hiçbir koşulda hata fırlatmaz; e-posta gitmese de başvuru geçerlidir.
 */

export type VillaApplicationNotificationInput = {
  ownerName: string;
  phone: string;
  email?: string;
  villaName: string;
  location: string;
  address?: string;
  description?: string;
  /** Panel etiketi → cevap (soru etiketiyle eşlenmiş, gösterime hazır). */
  answers: Array<[string, string]>;
  photoCount: number;
};

export async function notifyVillaApplication(
  input: VillaApplicationNotificationInput
): Promise<void> {
  const to =
    process.env.APPLICATION_NOTIFY_EMAIL || process.env.BOOKING_NOTIFY_EMAIL;

  if (!to) {
    console.warn(
      "APPLICATION_NOTIFY_EMAIL / BOOKING_NOTIFY_EMAIL tanımlı değil — villa başvurusu bildirimi gönderilmedi."
    );
    return;
  }

  const rows: Array<[string, string]> = [
    ["Villa", input.villaName],
    ["Konum", input.location],
    ["Sahibi", input.ownerName],
    ["Telefon", input.phone],
    ["E-posta", input.email || "—"],
  ];
  if (input.address) rows.push(["Adres", input.address]);
  for (const [label, value] of input.answers) rows.push([label, value]);
  rows.push(["Fotoğraf", `${input.photoCount} adet`]);
  if (input.description) rows.push(["Açıklama", input.description]);

  const panelUrl = siteUrl() ? `${siteUrl()}/yonetim/villa-basvurulari` : "";

  const mail = shell({
    heading: "Yeni villa başvurusu",
    intro: `<strong>${escapeHtml(input.ownerName)}</strong>, <strong>${escapeHtml(
      input.villaName
    )}</strong> villasını listelemek için başvurdu.`,
    rows,
    cta: panelUrl ? { href: panelUrl, label: "Panelde aç" } : undefined,
    footer:
      "Bu bildirim kastayimbugun.com villa başvuru formundan otomatik gönderildi.",
  });

  await sendEmail({
    to,
    subject: `Yeni villa başvurusu — ${input.villaName} · ${input.location}`,
    html: mail.html,
    text: textFrom(rows, panelUrl),
    // Acente doğrudan "Yanıtla" ile başvurana dönebilsin.
    replyTo: input.email || undefined,
  });
}

/* ---------------------------------------------------------------- şablon */

/**
 * Ortak HTML iskeleti. E-posta istemcileri modern CSS'i güvenilir uygulamadığı
 * için stiller inline ve düzen tablo tabanlı (bookingNotifications.ts ile aynı).
 */
function shell(opts: {
  heading: string;
  intro: string;
  rows: Array<[string, string]>;
  cta?: { href: string; label: string };
  footer: string;
}): { html: string } {
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

  const html = `<!doctype html>
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
          <p style="margin:28px 0 0;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">${escapeHtml(
            opts.footer
          )}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { html };
}

/** HTML görüntülenemeyen istemciler için düz metin karşılığı. */
function textFrom(rows: Array<[string, string]>, url: string): string {
  const body = rows.map(([label, value]) => `${label}: ${value}`).join("\n");
  return url ? `${body}\n\n${url}` : body;
}
