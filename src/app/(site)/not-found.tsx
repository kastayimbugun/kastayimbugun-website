import NotFoundClient from "@/components/NotFoundClient";

// Gerekçe için `src/app/not-found.tsx` içindeki nota bak: marka şablondan
// gelir, `robots` kökün `index, follow` bloğunu değiştirir.
export const metadata = {
  title: "Sayfa Bulunamadı",
  description: "Aradığınız sayfa veya villa bulunamadı.",
  robots: { index: false, follow: true },
};

export default function NotFoundPage() {
  return <NotFoundClient />;
}
