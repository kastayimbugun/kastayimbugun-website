import { requireAdmin } from "@/lib/auth/staff";
import { listStaff } from "@/lib/data/admin/staff";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import StaffManager from "@/components/admin/StaffManager";

export const dynamic = "force-dynamic";

export default async function PersonelPage() {
  // Yalnızca admin — izinle verilmez (Katman 2).
  const me = await requireAdmin();
  const staff = await listStaff();

  return (
    <div>
      <PageHeader
        title="Personel"
        description="Panele erişecek kişileri ekleyin, rollerini ve modül izinlerini belirleyin. Yalnızca adminler bu ekranı görür."
      />
      <div className="mt-6">
        <StaffManager staff={staff} meId={me.id} />
      </div>
    </div>
  );
}
