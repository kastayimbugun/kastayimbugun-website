"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, ArrowUp, ArrowDown, Loader2, Images } from "lucide-react";
import {
  uploadImage,
  deleteImage,
  reorderImage,
  updateImageAlt,
  type ImageResult,
} from "@/lib/actions/admin/images";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/images/limits";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { EmptyState } from "@/components/admin/ui/PageHeader";
import { btnIcon, btnIconDanger, labelCls } from "@/components/admin/ui/styles";
import type { AdminImage } from "@/lib/data/admin/villas";

/** Action sonucunu tek biçimde kullanıcıya çeviren yardımcı. */
function errorText(res: Extract<ImageResult, { ok: false }>): string {
  switch (res.error) {
    case "auth":
      return "Oturumunuz sona ermiş. Yeniden giriş yapın.";
    case "toobig":
      return `Görsel ${MAX_UPLOAD_LABEL}'tan büyük olamaz.`;
    case "type":
      return "Dosya okunamadı — yalnızca görsel yüklenebilir.";
    default:
      return "İşlem başarısız.";
  }
}

export default function ImageManager({
  villaId,
  images,
}: {
  villaId: string;
  images: AdminImage[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(
    null
  );

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    // Sunucuya gitmeden ele: sınırı aşan istek Server Action gövde sınırına
    // takılır ve hata nesnesi yerine ham hata fırlatır.
    const tooBig = Array.from(files).find((f) => f.size > MAX_UPLOAD_BYTES);
    if (tooBig) {
      toast.error(`"${tooBig.name}" ${MAX_UPLOAD_LABEL}'tan büyük.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    const list = Array.from(files);
    start(async () => {
      let done = 0;
      setProgress({ done: 0, total: list.length });
      for (const file of list) {
        const fd = new FormData();
        fd.set("villaId", villaId);
        fd.set("file", file);
        const res = await uploadImage(fd);
        if (!res.ok) {
          // Hangi dosyada durduğumuzu söyle — önceki sürümde bu bilgi yoktu.
          toast.error(`"${file.name}" yüklenemedi: ${errorText(res)}`);
          break;
        }
        done += 1;
        setProgress({ done, total: list.length });
      }
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
      if (done > 0) {
        toast.success(
          done === 1 ? "Görsel yüklendi." : `${done} görsel yüklendi.`
        );
      }
      router.refresh();
    });
  };

  const remove = async (img: AdminImage, index: number) => {
    const ok = await confirm({
      title: "Görsel silinsin mi?",
      body:
        index === 0
          ? "Bu villanın kapak fotoğrafı. Silinince sıradaki fotoğraf kapak olur. Dosya kalıcı olarak silinir, geri alınamaz."
          : "Dosya kalıcı olarak silinir, geri alınamaz.",
      confirmLabel: "Sil",
      tone: "danger",
    });
    if (!ok) return;

    setBusyId(img.id);
    start(async () => {
      const res = await deleteImage({
        id: img.id,
        villaId,
        storagePath: img.storagePath,
      });
      setBusyId(null);
      if (res.ok) toast.success("Görsel silindi.");
      else toast.error(errorText(res));
      router.refresh();
    });
  };

  const move = (img: AdminImage, direction: "up" | "down") => {
    setBusyId(img.id);
    start(async () => {
      const res = await reorderImage({ id: img.id, villaId, direction });
      setBusyId(null);
      if (!res.ok) toast.error(errorText(res));
      router.refresh();
    });
  };

  const saveAlt = (img: AdminImage, altTr: string) => {
    start(async () => {
      const res = await updateImageAlt({ id: img.id, villaId, altTr });
      if (res.ok) toast.success("Alt metin kaydedildi.");
      else toast.error(errorText(res));
      router.refresh();
    });
  };

  const uploadButton = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => onFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-300 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Upload className="h-4 w-4" />
        )}
        {progress
          ? `Yükleniyor… ${progress.done}/${progress.total}`
          : "Görsel yükle"}
      </button>
    </>
  );

  return (
    <div>
      {images.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Henüz görsel yok"
          description="İlk yüklediğiniz fotoğraf kapak olur. Yükleme sırasında görseller otomatik olarak küçültülür ve konum bilgisi temizlenir."
          action={uploadButton}
        />
      ) : (
        <>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((img, i) => (
              <li
                key={img.id}
                className="overflow-hidden rounded-xl border border-sand-200 bg-white"
              >
                <div className="relative aspect-[4/3] bg-sand-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.altTr ?? ""}
                    className="h-full w-full object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute left-2 top-2 rounded bg-brand-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Kapak
                    </span>
                  )}
                  {busyId === img.id && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/60">
                      <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-2">
                  <label className="block">
                    <span className={`${labelCls} mb-0.5`}>Alt metin</span>
                    <input
                      defaultValue={img.altTr ?? ""}
                      onBlur={(e) => {
                        if (e.target.value !== (img.altTr ?? ""))
                          saveAlt(img, e.target.value);
                      }}
                      placeholder="Ör. havuz ve deniz manzarası"
                      className="w-full rounded-lg border border-sand-200 px-2 py-1 text-xs text-brand-950 outline-none transition placeholder:text-brand-900/45 focus:border-brand-500 focus:ring-2 focus:ring-brand-300"
                    />
                  </label>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => move(img, "up")}
                        disabled={pending || i === 0}
                        className={btnIcon}
                        aria-label="Yukarı taşı"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(img, "down")}
                        disabled={pending || i === images.length - 1}
                        className={btnIcon}
                        aria-label="Aşağı taşı"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => void remove(img, i)}
                      disabled={pending}
                      className={btnIconDanger}
                      aria-label="Görseli sil"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4">{uploadButton}</div>
        </>
      )}
    </div>
  );
}
