import { getVillaOptions } from "@/lib/data/admin/villas";
import CategoryForm from "@/components/admin/CategoryForm";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function YeniKategoriPage() {
  const villas = await getVillaOptions();

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/yonetim/kategoriler">Kategoriler</BackLink>

      <div className="mt-3">
        <PageHeader
          title="Yeni Kategori"
          description="Kategori bilgilerini girin ve hangi villaların bu kategoride görüneceğini seçin."
        />
      </div>

      <div className="mt-5">
        <CategoryForm category={null} villas={villas} mode="create" />
      </div>
    </div>
  );
}
