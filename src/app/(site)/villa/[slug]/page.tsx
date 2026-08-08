import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VillaDetailClient from "@/components/VillaDetailClient";
import { getVilla, getVillas, getVillaSlugs } from "@/lib/data/villas";
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
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [villa, all, site] = await Promise.all([
    getVilla(slug),
    getVillas(),
    getSiteSettings(),
  ]);
  if (!villa) notFound();

  const prefs = site.villaDetailPrefs;

  // "Benzer Villalar" kategori moduna alınmışsa, o kategorinin villalarını
  // önceden çöz — istemci bileşeni kategori verisine erişmesin diye burada yapılır.
  let categoryVillas: Villa[] | undefined;
  if (prefs.similar.mode === "category" && prefs.similar.categorySlug) {
    const cats = await getCategories();
    const cat = cats.find((c) => c.slug === prefs.similar.categorySlug);
    if (cat) {
      const bySlug = new Map(all.map((v) => [v.slug, v]));
      categoryVillas = cat.villaSlugs
        .map((s) => bySlug.get(s))
        .filter((v): v is Villa => Boolean(v));
    }
  }

  return (
    <VillaDetailClient
      villa={villa}
      otherVillas={all}
      prefs={prefs}
      categoryVillas={categoryVillas}
    />
  );
}
