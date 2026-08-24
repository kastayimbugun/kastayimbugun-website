import type { Metadata } from "next";
import { getActiveApplicationQuestions } from "@/lib/data/applicationQuestions";
import VillaApplicationForm from "@/components/VillaApplicationForm";

// Sorular panelden değişebildiği için sayfa taze render edilir.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Villanızı Kiraya Verin — Başvuru",
  description:
    "Villanızı listelemek için başvurun: konum, özellikler ve fotoğrafları paylaşın, ekibimiz sizinle iletişime geçsin.",
};

export default async function VillaApplicationPage() {
  const questions = await getActiveApplicationQuestions();
  return <VillaApplicationForm questions={questions} />;
}
