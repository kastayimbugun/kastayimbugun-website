"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Loader2 } from "lucide-react";

import VillaCard from "@/components/VillaCard";
import { useFavorites } from "@/lib/useFavorites";
import { useI18n } from "@/lib/i18n";
import { getFavoriteCards } from "@/lib/actions/favorites";
import type { VillaCardData } from "@/lib/data/villas";

/**
 * Favori villalar sayfası.
 *
 * Liste `localStorage`'da olduğu için sunucu onu bilemez; slug'lar istemciden
 * bir sunucu eylemine gönderilir ve kartlar oradan döner. Böylece villa
 * verisi tek yerde (veri katmanı) kalır, istemciye ayrı bir API yüzeyi
 * açılmaz ve yalnızca YAYINDAKİ villalar dönebilir.
 */
export default function FavoritesClient() {
  const { t } = useI18n();
  const { slugs, ready, count } = useFavorites();
  /**
   * Sunucudan çekilmiş kartlar ve hangi slug'lar için çekildikleri.
   *
   * Gösterilecek liste bu durumdan TÜRETİLİR, ayrıca saklanmaz: kullanıcı bu
   * sayfada bir kalbi kapattığında kart anında kalkar, sunucuya tekrar gitmek
   * gerekmez. Durumu ikiye bölmek (hem `villas` hem `loading`) ikisinin
   * ayrışmasına açık kapı bırakıyordu.
   */
  const [loaded, setLoaded] = useState<{
    slugs: string[];
    villas: VillaCardData[];
  }>({ slugs: [], villas: [] });

  // Elimizde olmayan bir favori var mı — varsa hâlâ yükleniyoruz.
  const eksik = slugs.some((s) => !loaded.slugs.includes(s));
  const loading = !ready || (slugs.length > 0 && eksik);
  const villas = loaded.villas.filter((v) => slugs.includes(v.slug));

  // Etki gövdesinde senkron `setState` YOK: yalnızca istek dönünce yazılır.
  const anahtar = slugs.join(",");
  useEffect(() => {
    if (!ready || slugs.length === 0 || !eksik) return;
    let iptal = false;
    const istenen = slugs;
    getFavoriteCards(istenen)
      .then((rows) => {
        if (!iptal) setLoaded({ slugs: istenen, villas: rows });
      })
      .catch(() => {
        // Ağ hatası: boş sonuçla işaretle ki sonsuz dönen bir çark kalmasın.
        if (!iptal) setLoaded({ slugs: istenen, villas: [] });
      });
    return () => {
      iptal = true;
    };
    // `slugs` her okumada yeni dizi olabilir; kimliği birleştirilmiş metin taşır.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, anahtar, eksik]);

  return (
    <main className="mx-auto max-w-7xl px-8 py-10 sm:px-10">
      <h1 className="text-3xl font-extrabold tracking-tight text-brand-950">
        {t("fav.title")}
      </h1>
      {ready && count > 0 && (
        <p className="mt-1 text-brand-900/60">
          {count} {t("fav.count")}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-24 text-brand-900/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : villas.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-sand-200 bg-sand-50 px-6 py-20 text-center">
          <Heart className="mx-auto h-10 w-10 text-rose-300" />
          <p className="mt-4 font-bold text-brand-950">{t("fav.empty")}</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-brand-900/60">
            {t("fav.emptyDesc")}
          </p>
          <Link
            href="/villalar"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-sun-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sun-600"
          >
            {t("fav.browse")}
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid list-none gap-6 p-0 sm:grid-cols-2 xl:grid-cols-3">
          {villas.map((v, i) => (
            <li key={v.slug}>
              <VillaCard villa={v} eager={i < 3} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
