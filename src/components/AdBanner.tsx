import Link from "next/link";

/**
 * Ana sayfa reklam/kampanya bandı — panelden yönetilir.
 * - Web (masaüstü): yatay geniş görsel (önerilen 1920×480)
 * - Mobil: 1320×1080 görsel
 *
 * Her platform ayrı görsel + ayrı göster/gizle. Görsel GIF ise animasyonu
 * korunur (animated WebP olarak saklanır). İlgili platformun görseli yoksa o
 * platformda hiç gösterilmez; ikisi de yoksa bileşen hiç render edilmez.
 *
 * next/image yerine <img>: animasyonlu WebP optimizasyon hattında ilk kareye
 * indirgenebiliyor; ham <img> animasyonu bozmadan gösterir.
 */
export default function AdBanner({
  web,
  mobile,
  link,
}: {
  web: string | null;
  mobile: string | null;
  link: string;
}) {
  if (!web && !mobile) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {web && (
        <Link
          href={link}
          aria-label="Kampanya"
          className="hidden overflow-hidden rounded-2xl sm:block"
        >
          {/* width/height olmadan görsel önce 0px yer kaplıyor, yüklenince
              ~320px'e sıçrayıp altındaki tüm bölümleri aşağı itiyordu (CLS).
              Banner sayfa ortasında olduğu için etkisi doğrudan görünür.
              Ölçüler panelde önerilen banner boyutlarıdır. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={web}
            alt="Kampanya"
            width={1920}
            height={480}
            style={{ aspectRatio: "1920 / 480" }}
            className="h-auto w-full"
          />
        </Link>
      )}
      {mobile && (
        <Link
          href={link}
          aria-label="Kampanya"
          className="block overflow-hidden rounded-2xl sm:hidden"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mobile}
            alt="Kampanya"
            width={1320}
            height={1080}
            style={{ aspectRatio: "1320 / 1080" }}
            className="h-auto w-full"
          />
        </Link>
      )}
    </section>
  );
}
