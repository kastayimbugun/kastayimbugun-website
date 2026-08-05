"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

/**
 * Ana sayfa hero arka planı: poster görseli + isteğe bağlı sessiz döngü videosu.
 *
 * Neden böyle (Faz 3):
 * - Eskiden otomatik oynayan YouTube iframe'i vardı. LCP'yi bozuyordu ve çerez
 *   onayı alınmadan 3. taraf çerezi yüklüyordu (KVKK). Video artık kendi
 *   dosyamız, 3. taraf isteği yok.
 * - LCP ögesi poster görselidir; video ancak masaüstünde ve sayfa yüklendikten
 *   sonra devreye girer, sonra yumuşakça açılır.
 * - Mobilde ve "hareketi azalt" tercihinde video hiç indirilmez.
 */
export default function HeroMedia({
  image,
  videoUrl,
}: {
  image: string | null;
  videoUrl: string | null;
}) {
  const [playVideo, setPlayVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (!videoUrl) return;
    const wide = window.matchMedia("(min-width: 768px)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");

    const decide = () => setPlayVideo(wide.matches && !calm.matches);
    decide();

    wide.addEventListener("change", decide);
    calm.addEventListener("change", decide);
    return () => {
      wide.removeEventListener("change", decide);
      calm.removeEventListener("change", decide);
    };
  }, [videoUrl]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-brand-950">
      {image && (
        <Image
          src={image}
          alt=""
          fill
          preload
          sizes="100vw"
          className="object-cover"
        />
      )}

      {playVideo && videoUrl && (
        <video
          src={videoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onCanPlay={() => setVideoReady(true)}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
            videoReady ? "opacity-100" : "opacity-0"
          }`}
        />
      )}

      {/* Metin okunurluğu için koyu degrade */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-950/75 via-brand-950/40 to-brand-950/25" />
      {/* Alt kenarda kademeli beyaz geçiş — beyaz bölüme yumuşak birleşim */}
      <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-white via-white/75 to-transparent" />
    </div>
  );
}
