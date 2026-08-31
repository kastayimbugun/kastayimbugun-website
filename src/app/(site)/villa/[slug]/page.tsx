import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VillaDetailClient from "@/components/VillaDetailClient";
import {
  getVilla,
  getVillaSlugs,
  getSimilarVillas,
  getVillasBySlugs,
} from "@/lib/data/villas";
import { getSiteSettings } from "@/lib/data/site";
import { getCategories } from "@/lib/data/categories";
import type { Villa } from "@/lib/types";

// Villa verisi değişince sayfa en geç 5 dakikada tazelenir
// (yönetim panelinde anlık tazeleme Faz 5'te eklenecek)
export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getVillaSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const villa = await getVilla(slug);
  if (!villa) return { title: "Villa bulunamadı — Kastayım Bugün Villaları" };
  return {
    title: `${villa.name}, ${villa.region} — Kastayım Bugün Villaları`,
    description: villa.descriptionTr,
  };
}

export default async function VillaPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;

  // Aramadan gelen bağlam: kullanıcı listede tarih seçtiyse burada da hazır
  // gelsin. Sunucuda çözülür, istemciye prop olarak iner (useSearchParams'a
  // gerek yok — o statik sayfayı CSR bailout'a düşürür).
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const iso = (v: string | string[] | undefined) => {
    const x = one(v);
    return x && /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null;
  };
  const initialCheckIn = iso(sp.giris) ?? iso(sp.in);
  const initialCheckOut = iso(sp.cikis) ?? iso(sp.out);
  const kisi = Number(one(sp.kisi) ?? one(sp.guests));
  const initialGuests = Number.isFinite(kisi) && kisi > 0 ? kisi : null;
  const [villa, site] = await Promise.all([getVilla(slug), getSiteSettings()]);
  if (!villa) notFound();

  const prefs = site.villaDetailPrefs;

  // "Benzer Villalar" kategori moduna alınmışsa, o kategorinin villalarını
  // önceden çöz — istemci bileşeni kategori verisine erişmesin diye burada yapılır.
  let categoryVillas: Villa[] | undefined;
  if (prefs.similar.mode === "category" && prefs.similar.categorySlug) {
    const cats = await getCategories();
    const cat = cats.find((c) => c.slug === prefs.similar.categorySlug);
    if (cat) {
      categoryVillas = await getVillasBySlugs(
        cat.villaSlugs.filter((s) => s !== slug),
        3
      );
    }
  }

  // Kategori modu değilse benzer villalar SQL'de 3'e daraltılır.
  // Eskiden burada `getVillas()` ile 600 villanın TAMAMI çekilip istemciye
  // prop'lanıyor, 3 tanesi kullanılıyordu.
  const similar =
    prefs.similar.mode === "category"
      ? []
      : await getSimilarVillas(slug, villa.region, 3);

  return (
    <VillaDetailClient
      villa={villa}
      otherVillas={similar}
      prefs={prefs}
      categoryVillas={categoryVillas}
      initialCheckIn={initialCheckIn}
      initialCheckOut={initialCheckOut}
      initialGuests={initialGuests}
    />
  );
}
