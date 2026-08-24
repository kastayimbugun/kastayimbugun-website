"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Archive, Trash2 } from "lucide-react";
import {
  updateApplicationNote,
  archiveApplication,
  deleteApplication,
} from "@/lib/actions/admin/applications";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { Field } from "@/components/admin/ui/FormField";
import {
  inputCls,
  btnPrimary,
  btnSecondary,
  btnDanger,
} from "@/components/admin/ui/styles";

/** Detay sayfasının yazma bölümü: iç not + arşivle/sil. */
export default function ApplicationActions({
  id,
  villaName,
  initialNote,
}: {
  id: string;
  villaName: string;
  initialNote: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [note, setNote] = useState(initialNote ?? "");
  const [savingNote, startNote] = useTransition();
  const [pending, startAction] = useTransition();

  const saveNote = () => {
    startNote(async () => {
      const res = await updateApplicationNote({ id, adminNote: note });
      if (res.ok) toast.success("Not kaydedildi.");
      else
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "Kaydedilemedi."
        );
    });
  };

  const onArchive = async () => {
    const ok = await confirm({
      title: "Başvuru arşivlensin mi?",
      body: "Kayıt ve fotoğraflar korunur; listeden kaldırılır ve “Arşiv” filtresine düşer.",
      confirmLabel: "Arşivle",
      cancelLabel: "Vazgeç",
      tone: "default",
    });
    if (!ok) return;
    startAction(async () => {
      const res = await archiveApplication({ id });
      if (res.ok) {
        toast.success("Başvuru arşivlendi.");
        router.push("/yonetim/villa-basvurulari");
      } else {
        toast.error("İşlem başarısız.");
      }
    });
  };

  const onDelete = async () => {
    const ok = await confirm({
      title: "Başvuru kalıcı olarak silinsin mi?",
      body: (
        <div className="space-y-1.5 text-sm text-brand-900/80">
          <p>
            <strong className="text-brand-950">{villaName}</strong> başvurusu ve
            tüm fotoğrafları kalıcı olarak silinecek.
          </p>
          <p className="text-xs font-semibold text-rose-700">
            Bu işlem geri alınamaz. Kaydı saklamak istiyorsanız “Arşivle”yi
            kullanın.
          </p>
        </div>
      ),
      confirmLabel: "Evet, kalıcı sil",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!ok) return;
    startAction(async () => {
      const res = await deleteApplication({ id });
      if (res.ok) {
        toast.success("Başvuru silindi.");
        router.push("/yonetim/villa-basvurulari");
      } else {
        toast.error("Silme işlemi başarısız oldu.");
      }
    });
  };

  return (
    <div className="space-y-5">
      <Field label="İç not" hint="Yalnızca personel görür; başvurana gitmez.">
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          className={`${inputCls} resize-y`}
          placeholder="Ör. 14:20 arandı, fiyat konuşuldu…"
        />
      </Field>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveNote}
          disabled={savingNote}
          className={btnPrimary}
        >
          {savingNote ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Notu kaydet
        </button>
      </div>

      <div className="flex flex-wrap justify-end gap-2 border-t border-sand-200 pt-4">
        <button
          type="button"
          onClick={onArchive}
          disabled={pending}
          className={btnSecondary}
        >
          <Archive className="h-4 w-4" />
          Arşivle
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={pending}
          className={btnDanger}
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Kalıcı sil
        </button>
      </div>
    </div>
  );
}
