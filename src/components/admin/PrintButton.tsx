"use client";

import { Printer } from "lucide-react";
import { btnPrimary } from "@/components/admin/ui/styles";

/** window.print() istemci gerektirir; sayfanın geri kalanı sunucu bileşeni. */
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`${btnPrimary} print:hidden`}
    >
      <Printer className="h-4 w-4" />
      Yazdır / PDF olarak kaydet
    </button>
  );
}
