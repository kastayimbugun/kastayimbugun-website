import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  getAdminCategory,
  getVillaPicks,
} from "@/lib/data/admin/categories";
import CategoryForm from "@/components/admin/CategoryForm";
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";

export const dynamic = "force-dynamic";

export default async function KategoriDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, villas] = await Promise.all([
    getAdminCategory(id),
    getVillaPicks(),
  ]);
  if (!category) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="flex items-center justify-between">
        <Link
          href="/yonetim/kategoriler"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Kategoriler
        </Link>
        <DeleteCategoryButton id={category.id} name={category.nameTr} />
      </div>
      <h1 className="mt-3 text-xl font-extrabold text-brand-950">
        {category.nameTr}
      </h1>
      <div className="mt-5">
        <CategoryForm category={category} villas={villas} mode="edit" />
      </div>
    </div>
  );
}
