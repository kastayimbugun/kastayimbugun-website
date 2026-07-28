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
import type { AdminSiteSettings } from "@/lib/data/admin/site";

export default function SiteSettingsForm({
  settings,
}: {
  settings: AdminSiteSettings;
}) {
  const router = useRouter();
  const [video, setVideo] = useState(settings.heroVideoUrl ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const saveVideo = () => {
    setMsg(null);
    start(async () => {
      const res = await saveHeroVideo({ heroVideoUrl: video.trim() });
      if (res.ok) {
        setMsg({ ok: true, text: "Kaydedildi." });
        router.refresh();
      } else {
        setMsg({
          ok: false,
          text:
            res.error === "validation"
              ? "Bağlantı https ile başlamalı ve .mp4 / .webm ile bitmeli."
              : "Kaydedilemedi.",
        });
      }
    });
  };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-bold text-brand-950">Ana sayfa görseli</h2>
        <p className="mt-1 text-sm text-brand-900/55">
          Sitenin en üstünde tam ekran gösterilir. Yatay, geniş bir fotoğraf
          seç. Yüklenmezse öne çıkan villalardan biri kullanılır.
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
          <span className="font-medium text-brand-900/45">(isteğe bağlı)</span>
        </h2>
        <p className="mt-1 text-sm text-brand-900/55">
          Görselin üzerinde sessiz döngüyle oynar. Kısa (8–12 sn) bir{" "}
          <code className="rounded bg-sand-100 px-1">.mp4</code> veya{" "}
          <code className="rounded bg-sand-100 px-1">.webm</code> bağlantısı
          gir. Mobilde bilerek oynatılmaz — yalnızca görsel görünür.
        </p>
        <div className="mt-3 flex max-w-xl flex-col gap-2 sm:flex-row">
          <input
            value={video}
            onChange={(e) => setVideo(e.target.value)}
            placeholder="https://…/hero.mp4"
            className="w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="button"
            onClick={saveVideo}
            disabled={pending}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Kaydet
          </button>
        </div>
        {msg && (
          <p
            className={`mt-2 text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
          >
            {msg.text}
          </p>
        )}
      </section>
    </div>
  );
}
