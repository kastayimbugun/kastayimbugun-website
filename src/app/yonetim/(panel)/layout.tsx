import { redirect } from "next/navigation";
import { getStaffUser } from "@/lib/auth/staff";
import AdminShell from "@/components/admin/AdminShell";

/**
 * Panel koruması (docs/panel-kurallari.md §1, Katman 2).
 * Personel değilse render etmeden girişe yönlendirir. Giriş sayfası bu grubun
 * DIŞINDA (/yonetim/giris) olduğu için bu korumaya takılmaz.
 */
export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getStaffUser();
  if (!staff) redirect("/yonetim/giris");

  return <AdminShell staff={staff}>{children}</AdminShell>;
}
