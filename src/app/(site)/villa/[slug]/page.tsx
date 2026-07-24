import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VillaDetailClient from "@/components/VillaDetailClient";
import { getVilla, getVillas, getVillaSlugs } from "@/lib/data/villas";

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
  const [villa, all] = await Promise.all([getVilla(slug), getVillas()]);
  if (!villa) notFound();
  return <VillaDetailClient villa={villa} otherVillas={all} />;
}
