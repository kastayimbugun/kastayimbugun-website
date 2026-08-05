"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteCategory } from "@/lib/actions/admin/categories";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";

export default function DeleteCategoryButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const onDelete = async () => {
    const ok = await confirm({
      title: "Kategori silinsin mi?",
      body: `"${name}" kategorisi silinecek. Villalar silinmez, yalnızca bu kategoriyle bağları kalkar.`,
      confirmLabel: "Sil",
      tone: "danger",
    });
    if (!ok) return;

    start(async () => {
      const res = await deleteCategory({ id });
      if (res.ok) {
        toast.success("Kategori silindi.");
        router.push("/yonetim/kategoriler");
      } else {
        toast.error(
          res.error === "auth"
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
      Kategoriyi sil
    </button>
  );
}
