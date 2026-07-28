import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // GEÇİCİ — seed'lenen demo veri hâlâ dış stok görsel URL'si tutuyor
      // (villalar picsum, kategoriler unsplash). Gerçek fotoğraflar panelden
      // yüklenince BU İKİ SATIRI SİL; Faz 3 ondan önce bitmiş sayılmaz.
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
    // Next 16'da izin verilen kalite listesi açıkça yazılır.
    qualities: [75],
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    // Panelden görsel yükleme çok parçalı (multipart) gövdeyle gelir.
    // Varsayılan 1 MB, 8 MB'lık dosyayı reddederdi; başlık payıyla birlikte 9 MB.
    // Sınırı değiştirirken src/lib/images/limits.ts ile birlikte güncelle.
    serverActions: { bodySizeLimit: "9mb" },
  },
};

export default nextConfig;
