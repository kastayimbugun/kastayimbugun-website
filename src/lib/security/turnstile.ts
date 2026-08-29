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
 * Artık üretimde eksik anahtar bir **yapılandırma hatasıdır, muafiyet değil**.
 *
 * ⚠️ Anahtar çifti birlikte tanımlanmalı:
 *   - `TURNSTILE_SECRET_KEY`         (sunucu, bu dosya)
 *   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (istemci, TurnstileWidget)
 * Yalnızca biri tanımlanırsa üretimde tüm gönderimler reddedilir. Bu bilinçli:
 * sessizce korumasız çalışmaktansa gürültülü şekilde durmak yeğdir.
 */
export async function verifyTurnstile(
  token: string,
  remoteIp?: string
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "TURNSTILE_SECRET_KEY tanımlı değil — üretimde form gönderimi reddedildi."
      );
      return false;
    }
    console.warn(
      "TURNSTILE_SECRET_KEY yok — spam koruması yalnızca GELİŞTİRMEDE atlanıyor."
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
