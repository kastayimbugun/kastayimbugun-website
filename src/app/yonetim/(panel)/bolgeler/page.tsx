import Link from "next/link";
import { Plus, MapPin } from "lucide-react";
import { getAdminRegionTree } from "@/lib/data/admin/regions";
import { flattenRegionTree } from "@/lib/regionTree";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";
import { btnPrimary } from "@/components/admin/ui/styles";
import RegionTreeClient from "@/components/admin/RegionTreeClient";

export const dynamic = "force-dynamic";

export default async function BolgelerPage() {
  const tree = await getAdminRegionTree();
  // Ağacın TAMAMI sayılır. Eskiden yalnızca kök sayısına bakılıyordu; derin
  // bölgeler ağaca hiç girmediği için sayı da eksik çıkıyordu.
  const totalCount =
    flattenRegionTree(tree.roots).length + tree.orphans.length;

  const newButton = (
    <Link href="/yonetim/bolgeler/yeni" className={btnPrimary}>
      <Plus className="h-4 w-4" />
      Yeni şehir / bölge
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Bölgeler ve Şehirler"
        description="Villaların atandığı şehirler ve alt bölgeler. Tutamak ikonuyla sıralamayı değiştirebilirsiniz."
        actions={totalCount > 0 ? newButton : undefined}
      />

      {totalCount === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={MapPin}
            title="Henüz şehir veya bölge yok"
            description="Villa ekleyebilmek için önce en az bir şehir veya bölge tanımlamalısınız."
            action={newButton}
          />
        </div>
      ) : (
        <div className="mt-6">
          <RegionTreeClient initialTree={tree} />
        </div>
      )}
    </div>
  );
}
