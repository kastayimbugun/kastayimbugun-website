import { getAllQuestions } from "@/lib/data/admin/applications";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";
import ApplicationQuestionManager from "@/components/admin/ApplicationQuestionManager";

export const dynamic = "force-dynamic";

export default async function ApplicationQuestionsPage() {
  const questions = await getAllQuestions();

  return (
    <div className="space-y-5">
      <BackLink href="/yonetim/villa-basvurulari">Villa Başvuruları</BackLink>

      <PageHeader
        title="Başvuru Formu Soruları"
        description="Villa özellikleri için formda sorulan sorular. Ekleyin, düzenleyin, zorunlu yapın veya sırayı değiştirin — değişiklik forma anında yansır."
      />

      <ApplicationQuestionManager questions={questions} />
    </div>
  );
}
