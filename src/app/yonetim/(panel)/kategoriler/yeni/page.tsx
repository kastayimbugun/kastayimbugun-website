import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getVillaPicks } from "@/lib/data/admin/categories";
import CategoryForm from "@/components/admin/CategoryForm";

export const dynamic = "force-dynamic";

export default async function YeniKategoriPage() {
  const villas = await getVillaPicks();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/yonetim/kategoriler"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Kategoriler
      </Link>
      <h1 className="mt-3 text-xl font-extrabold text-brand-950">
        Yeni Kategori
      </h1>
      <div className="mt-5">
        <CategoryForm category={null} villas={villas} mode="create" />
      </div>
    </div>
  );
}
