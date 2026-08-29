import "server-only";

/**
 * Cloudflare Turnstile doğrulaması — herkese açık formların spam koruması.
 *
 * Bu dosyadan önce aynı fonksiyonun iki kopyası vardı (`actions/booking.ts` ve
 * `actions/villaApplication.ts`) ve ikisi de **fail-open**'dı: anahtar tanımlı
 * değilse `true` dönüyorlardı. `.env.local`'da anahtar hiç olmadığı için koruma
 * fiilen kapalıydı — üstelik "yalnızca geliştirme" diyen yorum üretimde de
 * geçerliydi.
 *
 * Kural: **yapılandırılmışsa zorunlu, yapılandırılmamışsa yok.**
 *   - Anahtar YOK  → captcha atlanır (uyarı loglanır). Spam freni olarak IP
 *     hız sınırı devrede kalır (rateLimit.ts + migration 0023).
 *   - Anahtar VAR  → token zorunlu; yoksa veya doğrulanmazsa reddedilir.
 *     Ağ hatasında da reddedilir (fail-closed).
 *
 * ⚠️ Anahtar çifti BİRLİKTE tanımlanmalı:
 *   - `TURNSTILE_SECRET_KEY`           (sunucu, bu dosya)
 *   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (istemci, TurnstileWidget)
 * Yalnızca sunucu anahtarı tanımlanırsa istemci token üretmez ve TÜM gerçek
 * gönderimler reddedilir. İkisini aynı anda ekleyin.
 */
export async function verifyTurnstile(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    // Turnstile HİÇ yapılandırılmamış: anahtar yok demek "kurulmamış" demek,
    // "doğrulama başarısız" demek değil. Burada reddetmek meşru rezervasyon
    // taleplerini kaybettirir — nitekim 29.08.2026'da tam bunu yaptı.
    //
    // Bu dalın güvenli olmasının nedeni, spam frenininin TEK başına Turnstile
    // olmaması: IP başına hız sınırı (lib/security/rateLimit.ts + migration
    // 0023) her koşulda devrede ve rezervasyonda 8/saat, başvuruda 3/saat.
    //
    // Anahtar tanımlandığı an aşağıdaki kod SIKI davranır: token yoksa veya
    // doğrulanmazsa reddeder. Yani "yapılandırılmışsa zorunlu, değilse yok".
    console.warn(
      "TURNSTILE_SECRET_KEY tanımlı değil — captcha atlanıyor. " +
        "Spam koruması şu an yalnızca IP hız sınırı. " +
        "Vercel'e TURNSTILE_SECRET_KEY + NEXT_PUBLIC_TURNSTILE_SITE_KEY ekleyin."
    );
    return true;
  }

  // Anahtar tanımlı: bundan sonrası sıkı. Token yoksa geçiş yok.
  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          ...(remoteIp ? { remoteip: remoteIp } : {}),
        }),
        cache: "no-store",
      }
    );
    const body = (await res.json()) as { success?: boolean };
    return body.success === true;
  } catch {
    // Ağ hatasında fail-closed: doğrulayamadığımızı "doğrulandı" sayma.
    return false;
  }
}
