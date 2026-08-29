"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { togglePageStatusAction } from "@/lib/actions/admin/pages";
import { useToast } from "@/components/admin/ui/Toast";
import { CheckCircle, Clock } from "lucide-react";

interface PageStatusToggleProps {
  pageId: string;
  currentStatus: "draft" | "published";
}

export function PageStatusToggle({ pageId, currentStatus }: PageStatusToggleProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const toast = useToast();

  const handleToggle = () => {
    const nextStatus = currentStatus === "published" ? "draft" : "published";
    startTransition(async () => {
      // Sonucu okumadan geçme: oturum düşse veya RLS reddetse kullanıcı hiçbir şey
      // görmez, sayfa taslak kalır ve yayınlandığı sanılır.
      const res = await togglePageStatusAction(pageId, nextStatus);
      if (res.ok) {
        toast.success(
          nextStatus === "published" ? "Sayfa yayınlandı." : "Sayfa taslağa alındı."
        );
        router.refresh();
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş görünüyor. Lütfen yeniden giriş yapın."
            : "Durum değiştirilemedi. Tekrar deneyin."
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={isPending}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
        currentStatus === "published"
          ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
          : "bg-amber-100 text-amber-800 hover:bg-amber-200"
      } ${isPending ? "opacity-50 cursor-wait" : ""}`}
      title="Durumu değiştirmek için tıklayın"
    >
      {currentStatus === "published" ? (
        <>
          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
          Yayınlandı
        </>
      ) : (
        <>
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          Taslak
        </>
      )}
    </button>
  );
}
