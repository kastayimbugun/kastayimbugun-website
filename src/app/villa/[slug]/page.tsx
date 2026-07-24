import { notFound } from "next/navigation";
import type { Metadata } from "next";
import VillaDetailClient from "@/components/VillaDetailClient";
import { getVilla, villas } from "@/lib/villas";

export function generateStaticParams() {
  return villas.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const villa = getVilla(slug);
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
  const villa = getVilla(slug);
  if (!villa) notFound();
  return <VillaDetailClient villa={villa} />;
}
