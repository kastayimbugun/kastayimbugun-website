"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, Loader2, ImageOff } from "lucide-react";
import { MAX_UPLOAD_BYTES, MAX_UPLOAD_LABEL } from "@/lib/images/limits";

type ActionResult = { ok: true } | { ok: false; error: string };

const messages: Record<string, string> = {
  auth: "Oturumun sona ermiş olabilir, sayfayı yenile.",
  toobig: `Görsel ${MAX_UPLOAD_LABEL}'tan büyük olamaz.`,
  type: "Dosya okunamadı — yalnızca görsel yüklenebilir.",
  validation: "Görsel seçilmedi.",
  generic: "Yüklenemedi, tekrar dene.",
};

/**
 * Tekil görsel alanı: önizleme + yükle + kaldır.
 * Villa galerisi çok görselli olduğu için ayrı bileşen (ImageManager) kullanır.
 */
export default function ImageUploadField({
  url,
  alt,
  aspect = "aspect-[16/10]",
  onUpload,
  onRemove,
}: {
  url: string | null;
  alt: string;
  aspect?: string;
  onUpload: (formData: FormData) => Promise<ActionResult>;
  onRemove?: () => Promise<ActionResult>;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setError(null);

    // Sunucuya gitmeden ele: sınırı aşan istek Server Action gövde sınırına takılır.
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(messages.toobig);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    start(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await onUpload(fd);
      if (fileRef.current) fileRef.current.value = "";
      if (!res.ok) setError(messages[res.error] ?? messages.generic);
      else router.refresh();
    });
  };

  const clear = () => {
    if (!onRemove) return;
    setError(null);
    start(async () => {
      const res = await onRemove();
      if (!res.ok) setError(messages[res.error] ?? messages.generic);
      else router.refresh();
    });
  };

  return (
    <div>
      <div
        className={`relative ${aspect} w-full overflow-hidden rounded-xl border border-sand-200 bg-sand-100`}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-brand-900/35">
            <ImageOff className="h-6 w-6" />
            <span className="text-xs font-medium">Görsel yok</span>
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => pick(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          {url ? "Değiştir" : "Yükle"}
        </button>
        {url && onRemove && (
          <button
            type="button"
            onClick={clear}
            disabled={pending}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-brand-900/45 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Kaldır
          </button>
        )}
      </div>

      {error && <p className="mt-1.5 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
