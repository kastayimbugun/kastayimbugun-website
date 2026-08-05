"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import {
  uploadSiteHero,
  removeSiteHero,
  saveHeroVideo,
} from "@/lib/actions/admin/site";
import { useToast } from "@/components/admin/ui/Toast";
import { Field } from "@/components/admin/ui/FormField";
import { inputCls } from "@/components/admin/ui/styles";
import type { AdminSiteSettings } from "@/lib/data/admin/site";

export default function SiteSettingsForm({
  settings,
}: {
  settings: AdminSiteSettings;
}) {
  const router = useRouter();
  const toast = useToast();
  const [video, setVideo] = useState(settings.heroVideoUrl ?? "");
  const [error, setError] = useState<string>("");
  const [pending, start] = useTransition();

  const saveVideo = () => {
    setError("");
    start(async () => {
      const res = await saveHeroVideo({ heroVideoUrl: video.trim() });
      if (res.ok) {
        toast.success("Kaydedildi.");
        router.refresh();
      } else if (res.error === "validation") {
        setError("Bağlantı https ile başlamalı ve .mp4 / .webm ile bitmeli.");
        toast.error("Bağlantı biçimi geçersiz.");
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "Kaydedilemedi."
        );
      }
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-bold text-brand-950">Ana sayfa görseli</h2>
        <p className="mt-1 text-sm text-brand-900/70">
          Sitenin en üstünde tam ekran gösterilir. Yatay, geniş bir fotoğraf
          seçin. Yüklenmezse öne çıkan villalardan biri kullanılır.
        </p>
        <div className="mt-3 max-w-md">
          <ImageUploadField
            url={settings.heroImageUrl}
            alt="Ana sayfa hero görseli"
            aspect="aspect-[16/9]"
            onUpload={uploadSiteHero}
            onRemove={removeSiteHero}
          />
        </div>
      </section>

      <section>
        <h2 className="text-sm font-bold text-brand-950">
          Ana sayfa videosu{" "}
          <span className="font-medium text-brand-900/70">(isteğe bağlı)</span>
        </h2>
        <p className="mt-1 text-sm text-brand-900/70">
          Görselin üzerinde sessiz döngüyle oynar. Kısa (8–12 sn) bir{" "}
          <code className="rounded bg-sand-100 px-1">.mp4</code> veya{" "}
          <code className="rounded bg-sand-100 px-1">.webm</code> bağlantısı
          girin. Mobilde bilerek oynatılmaz — yalnızca görsel görünür.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveVideo();
          }}
          className="mt-3 flex max-w-xl flex-col gap-2 sm:flex-row sm:items-start"
        >
          <Field
            label="Video bağlantısı"
            error={error}
            className="w-full"
          >
            <input
              value={video}
              onChange={(e) => {
                setVideo(e.target.value);
                setError("");
              }}
              placeholder="https://…/hero.mp4"
              className={inputCls}
            />
          </Field>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50 sm:mt-[1.375rem]"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Kaydet
          </button>
        </form>
      </section>
    </div>
  );
}
