"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import DeleteVillaModal from "./DeleteVillaModal";

export default function DeleteVillaButton({
  villaId,
  villaName,
}: {
  villaId: string;
  villaName: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Villayı Sil
      </button>

      <DeleteVillaModal
        villaId={villaId}
        villaName={villaName}
        isOpen={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
