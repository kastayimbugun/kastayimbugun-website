import "server-only";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Herkese açık formlar için IP başına hız sınırı (0023_rate_limits.sql).
 *
 * Sayaç Postgres'te atomik tutulur; bellek-içi bir Map serverless'ta işe
 * yaramaz (her örnek kendi sayacını tutar, saldırgan istekleri yayarak aşar).
 *
 * PII notu: ham IP saklanmaz, sha256 özeti tutulur (ARCHITECTURE.md §5 —
 * "kişisel veri logda/URL'de taşınmaz"). Özet yalnızca aynı IP'yi aynı pencerede
 * eşleştirmeye yarar, geri çevrilmesi hedeflenmez.
 */

/** İstemcinin IP'si — Vercel `x-forwarded-for` başlığını ilk sırada verir. */
async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitBucket = "booking" | "application";

/**
 * Sınırı aşmadıysa `true` döner ve sayacı artırır.
 *
 * Sayaç okunamazsa (DB hatası) **izin verir**: hız sınırı bir kolaylık katmanıdır,
 * onu çalıştıramadığımız için meşru bir rezervasyon talebini kaybetmek daha
 * pahalıdır. Asıl spam bariyeri Turnstile'dır ve o fail-closed'dır.
 */
export async function allowRequest(
  bucket: RateLimitBucket,
  opts: { max: number; windowMinutes: number }
): Promise<boolean> {
  try {
    const ip = await clientIp();
    if (ip === "unknown") return true;

    const key = createHash("sha256").update(ip).digest("hex");
    const { data, error } = await supabaseAdmin().rpc("rate_limit_hit", {
      p_bucket: bucket,
      p_key: key,
      p_window_minutes: opts.windowMinutes,
      p_max: opts.max,
    });

    if (error) {
      console.error("[rateLimit] sayaç okunamadı:", error.message);
      return true;
    }
    return data !== false;
  } catch (e) {
    console.error("[rateLimit] beklenmeyen hata:", e);
    return true;
  }
}
