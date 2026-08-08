"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteRegion } from "@/lib/actions/admin/regions";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";

/**
 * Bölge silme. Villası olan bölge silinemez (DB'de de FK kısıtı var);
 * kullanıcıyı onay diyaloğuna hiç sokmadan, sebebini söyleyerek durduruyoruz.
 */
export default function DeleteRegionButton({
  id,
  name,
  villaCount,
}: {
  id: string;
  name: string;
  villaCount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const onDelete = async () => {
    if (villaCount > 0) {
      toast.error(
        `${name} bölgesinde ${villaCount} villa var. Önce onları başka bölgeye taşıyın.`
      );
      return;
    }

    const ok = await confirm({
      title: "Bölge silinsin mi?",
      body: `"${name}" bölgesi kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      tone: "danger",
    });
    if (!ok) return;

    start(async () => {
      const res = await deleteRegion({ id });
      if (res.ok) {
        toast.success("Bölge silindi.");
        router.push("/yonetim/bolgeler");
      } else {
        toast.error(
          res.error === "inuse"
            ? "Bu bölgeye bağlı villa var, silinemez."
            : res.error === "auth"
              ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
              : "Silinemedi."
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={() => void onDelete()}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Bölgeyi sil
    </button>
  );
}
