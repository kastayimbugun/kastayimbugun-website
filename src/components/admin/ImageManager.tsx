"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import {
  uploadImage,
  deleteImage,
  reorderImage,
  updateImageAlt,
} from "@/lib/actions/admin/images";
import type { AdminImage } from "@/lib/data/admin/villas";

export default function ImageManager({
  villaId,
  images,
}: {
  villaId: string;
  images: AdminImage[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    start(async () => {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("villaId", villaId);
        fd.set("file", file);
        const res = await uploadImage(fd);
        if (!res.ok) {
          setError(
            res.error === "toobig"
              ? "Görsel 8 MB'tan büyük olamaz."
              : res.error === "type"
                ? "Yalnızca görsel dosyası yüklenebilir."
                : "Yüklenemedi."
          );
          break;
        }
      }
      if (fileRef.current) fileRef.current.value = "";
      router.refresh();
    });
  };

  const remove = (img: AdminImage) => {
    setBusyId(img.id);
    start(async () => {
      await deleteImage({
        id: img.id,
        villaId,
        storagePath: img.storagePath,
      });
      setBusyId(null);
      router.refresh();
    });
  };

  const move = (img: AdminImage, direction: "up" | "down") => {
    setBusyId(img.id);
    start(async () => {
      await reorderImage({ id: img.id, villaId, direction });
      setBusyId(null);
      router.refresh();
    });
  };

  const saveAlt = (img: AdminImage, altTr: string) => {
    start(async () => {
      await updateImageAlt({ id: img.id, villaId, altTr });
      router.refresh();
    });
  };

  return (
    <div>
      {images.length === 0 ? (
        <p className="text-sm text-brand-900/45">Henüz görsel yok.</p>
      ) : (
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
                <input
                  defaultValue={img.altTr ?? ""}
                  onBlur={(e) => {
                    if (e.target.value !== (img.altTr ?? ""))
                      saveAlt(img, e.target.value);
                  }}
                  placeholder="Alt metin"
                  className="w-full rounded-lg border border-sand-200 px-2 py-1 text-xs outline-none focus:border-brand-400"
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      onClick={() => move(img, "up")}
                      disabled={pending || i === 0}
                      className="rounded p-1 text-brand-700 hover:bg-sand-100 disabled:opacity-30"
                      aria-label="Yukarı"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => move(img, "down")}
                      disabled={pending || i === images.length - 1}
                      className="rounded p-1 text-brand-700 hover:bg-sand-100 disabled:opacity-30"
                      aria-label="Aşağı"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => remove(img)}
                    disabled={pending}
                    className="rounded p-1 text-brand-900/40 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Yükleme */}
      <div className="mt-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-brand-300 px-4 py-2.5 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Görsel yükle
        </button>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
