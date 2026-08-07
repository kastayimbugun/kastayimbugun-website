"use client";

import React, { useState, useTransition } from "react";
import { deletePageAction } from "@/lib/actions/admin/pages";
import { Trash2 } from "lucide-react";

interface PageDeleteButtonProps {
  pageId: string;
  pageTitle: string;
}

export function PageDeleteButton({ pageId, pageTitle }: PageDeleteButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm(`"${pageTitle}" sayfasını silmek istediğinize emin misiniz?`)) {
      startTransition(async () => {
        const res = await deletePageAction(pageId);
        if (!res.ok) {
          alert("Sayfa silinirken bir hata oluştu.");
        }
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
      title="Sayfayı Sil"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
