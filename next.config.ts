import type { NextConfig } from "next";

// Supabase Storage'ın TAM host adı ortam değişkeninden türetilir. Wildcard
// (`*.supabase.co`) bu Next sürümünde host'u eşleştiremeyip `_next/image`'ı
// 400'e düşürüyordu; panelden yüklenen gerçek fotoğraflar bu yüzden görünmüyordu.
const supabaseHostname = (() => {
  try {
    const raw = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(
      /^["']|["']$/g,
      ""
    );
    return new URL(raw).hostname;
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Tam host (ör. loxtmqhfhbnvxfqctnyn.supabase.co) — panelden yüklenen görseller.
      ...(supabaseHostname
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHostname,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // picsum ve eski site (kastayimbugunvillalari.com) 29.08.2026'da
      // kaldırıldı: villa görsellerinin tamamı (1.102/1.102) Supabase
      // Storage'a taşındı, DB'de bu host'lara tek referans kalmadı.
      //
      // Unsplash HÂLÂ GEREKLİ: 13 kategori görseli demo seed'inden kalma
      // stok fotoğrafa işaret ediyor. Kategorilere gerçek görsel yüklenince
      // bu satır da silinmeli (aşağıdaki CSP img-src ile birlikte).
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Next 16'da izin verilen kalite listesi açıkça yazılır.
    qualities: [75],
    formats: ["image/avif", "image/webp"],
    // 3840w/2048w adayları bu tasarımda hiç kullanılmıyor (en geniş konteyner
    // max-w-7xl = 1280px) ama her biri sunucuda ayrı bir AVIF kodlaması demek.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [96, 128, 256, 384],
    // Varsayılan 4 saat. Villa fotoğrafı değişmez — yeni yükleme yeni yol üretir.
    // 600 villa × ~30 fotoğraf × 6 boyut × 2 format ≈ 216.000 türev; bunların
    // 4 saatte bir yeniden kodlanması ciddi CPU maliyeti.
    minimumCacheTTL: 2678400, // 31 gün
  },
  /**
   * Güvenlik başlıkları (ARCHITECTURE.md §5, docs/panel-kurallari.md §2).
   *
   * 29.08.2026 denetimine kadar yanıtta TEK BİR güvenlik başlığı yoktu.
   * CSP burada özellikle önemli: panel içeriğindeki depolanmış XSS'in tek
   * kapsayıcı savunmasıdır ve `frame-ancestors` olmadan /yonetim clickjacking'e
   * açıktır.
   *
   * `'unsafe-inline'` script-src'de GEÇİCİ: Next 16 önyükleme script'ini satır içi
   * gömüyor. Sonraki adım proxy.ts'te nonce üretip
   * `script-src 'self' 'nonce-…' 'strict-dynamic'` ile bunu kaldırmak
   * (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
   */
  async headers() {
    const supabaseOrigin = supabaseHostname ? `https://${supabaseHostname}` : "";
    // React geliştirme modu hata ayıklama için eval() kullanır (üretimde ASLA
    // kullanmaz). Üretim CSP'si bu yüzden gevşetilmiyor; yalnızca dev.
    const devEval = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${devEval} https://challenges.cloudflare.com`,
      "style-src 'self' 'unsafe-inline'",
      // Villa fotoğrafları Supabase Storage'dan. Unsplash yalnızca kategori
      // görselleri için kaldı; onlar da değişince buradan çıkarılmalı.
      `img-src 'self' blob: data: ${supabaseOrigin} https://images.unsplash.com`,
      "font-src 'self' data:",
      `connect-src 'self' ${supabaseOrigin} https://challenges.cloudflare.com`,
      // Turnstile widget'ı ve villa tanıtım videosu (YouTube/Vimeo gömme).
      "frame-src https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
    ];
  },
  experimental: {
    // Panelden görsel yükleme çok parçalı (multipart) gövdeyle gelir.
    // Varsayılan 1 MB, 8 MB'lık dosyayı reddederdi; başlık payıyla birlikte 9 MB.
    // Sınırı değiştirirken src/lib/images/limits.ts ile birlikte güncelle.
    serverActions: { bodySizeLimit: "9mb" },
  },
};

export default nextConfig;
