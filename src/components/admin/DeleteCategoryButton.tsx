"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { deleteCategory } from "@/lib/actions/admin/categories";

export default function DeleteCategoryButton({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onDelete = () => {
    if (!window.confirm(`"${name}" kategorisini silmek istiyor musunuz?`))
      return;
    start(async () => {
      const res = await deleteCategory({ id });
      if (res.ok) router.push("/yonetim/kategoriler");
      else window.alert("Silinemedi.");
    });
  };

  return (
    <button
      onClick={onDelete}
      disabled={pending}
      className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
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
