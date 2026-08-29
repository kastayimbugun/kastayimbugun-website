import { requireModule } from "@/lib/auth/staff";

// Katman 2 (sayfa guard'ı): bu modülün tüm alt sayfalarını izinle korur.
// İzni olmayan personel /yonetim'e döner (docs/panel-kurallari.md §1).
export default async function ModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModule("categories");
  return children;
}
