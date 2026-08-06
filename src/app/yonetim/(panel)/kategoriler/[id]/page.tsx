import { notFound } from "next/navigation";
import { getAdminCategory } from "@/lib/data/admin/categories";
import { getVillaOptions } from "@/lib/data/admin/villas";
import CategoryForm from "@/components/admin/CategoryForm";
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function KategoriDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [category, villas] = await Promise.all([
    getAdminCategory(id),
    getVillaOptions(),
  ]);
  if (!category) notFound();

  return (
    <div>
      <BackLink href="/yonetim/kategoriler">Kategoriler</BackLink>

      <div className="mt-3">
        <PageHeader
          title={category.nameTr}
          actions={
            <DeleteCategoryButton id={category.id} name={category.nameTr} />
          }
        />
      </div>

      <div className="mt-5">
        <CategoryForm category={category} villas={villas} mode="edit" />
      </div>
    </div>
  );
}
