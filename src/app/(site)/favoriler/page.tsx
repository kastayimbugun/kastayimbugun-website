import type { Metadata } from "next";
import FavoritesClient from "@/components/FavoritesClient";

export const metadata: Metadata = {
  title: "Favorilerim",
  description: "Beğendiğiniz villaları bir arada görün.",
  // Favoriler kişiye özel ve tarayıcıda saklanıyor; arama motorunun
  // dizinleyeceği bir içerik yok.
  robots: { index: false, follow: true },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
