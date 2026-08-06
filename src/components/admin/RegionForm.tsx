"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createRegion,
  updateRegion,
  uploadRegionHero,
  removeRegionHero,
} from "@/lib/actions/admin/regions";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { slugify } from "@/lib/slugify";
import { Field, Section } from "@/components/admin/ui/FormField";
import SaveBar from "@/components/admin/ui/SaveBar";
import { useToast } from "@/components/admin/ui/Toast";
import { useUnsavedGuard } from "@/components/admin/ui/useUnsavedGuard";
import { inputCls } from "@/components/admin/ui/styles";
import type { AdminRegion } from "@/lib/data/admin/regions";

type FormState = {
  name: string;
  province: string;
  slug: string;
  sortOrder: string;
};

function fromRegion(r: AdminRegion | null): FormState {
  return {
    name: r?.name ?? "",
    province: r?.province ?? "",
    slug: r?.slug ?? "",
    sortOrder: String(r?.sortOrder ?? 0),
  };
}

/**
 * Bölge ekleme/düzenleme formu — villa ve kategori formlarıyla aynı desen
 * (kendi sayfası, SaveBar, kaydedilmemiş değişiklik koruması).
 *
 * Görsel yükleme yalnızca düzenlemede görünür: yükleme bir `regionId` ister,
 * bölge kaydedilmeden o kimlik yoktur.
 */
export default function RegionForm({
  region,
  mode,
}: {
  region: AdminRegion | null;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const [saved, setSaved] = useState<FormState>(() => fromRegion(region));
  const [f, setF] = useState<FormState>(() => fromRegion(region));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = useMemo(
    () => JSON.stringify(f) !== JSON.stringify(saved),
    [f, saved]
  );
  useUnsavedGuard(dirty);

  const set = (k: keyof FormState, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const submit = () => {
    setErrors({});
    start(async () => {
      const res =
        mode === "edit" && region
          ? await updateRegion({ id: region.id, ...f })
          : await createRegion(f);

      if (res.ok) {
        setSaved(f); // çıkış uyarısı tetiklenmesin
        if (mode === "create") {
          toast.success("Bölge eklendi.");
          router.push("/yonetim/bolgeler");
        } else {
          toast.success("Kaydedildi.");
          router.refresh();
        }
        return;
      }

      if (res.fields && Object.keys(res.fields).length > 0) {
        setErrors(res.fields);
        toast.error("Bazı alanlar eksik veya hatalı — işaretli yerlere bakın.");
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
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-5"
    >
      <Section title="Bölge Bilgisi">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Bölge adı" required error={errors.name}>
            <input
              className={inputCls}
              value={f.name}
              onChange={(e) => {
                set("name", e.target.value);
                // Yeni kayıtta slug addan türer; düzenlemede URL sabit kalsın.
                if (mode === "create") set("slug", slugify(e.target.value));
              }}
            />
          </Field>

          <Field label="İl" required error={errors.province}>
            <input
              className={inputCls}
              value={f.province}
              onChange={(e) => set("province", e.target.value)}
            />
          </Field>

          <Field
            label="Kısa ad (slug)"
            required
            error={errors.slug}
            hint="URL'de görünür, benzersiz olmalı. Ör. kalkan"
          >
            <input
              className={inputCls}
              value={f.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
          </Field>

          <Field
            label="Sıra"
            error={errors.sortOrder}
            hint="Küçük sayı önce görünür."
          >
            <input
              type="number"
              min={0}
              className={inputCls}
              value={f.sortOrder}
              onChange={(e) => set("sortOrder", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      {mode === "edit" && region && (
        <Section
          title="Ana sayfadaki kart görseli"
          description="Yüklenmezse kart, bu bölgedeki bir villanın fotoğrafını kullanır."
        >
          <div className="max-w-md">
            <ImageUploadField
              url={region.heroImageUrl}
              alt={`${region.name} bölge görseli`}
              aspect="aspect-[16/10]"
              onUpload={(fd) => {
                fd.set("regionId", region.id);
                return uploadRegionHero(fd);
              }}
              onRemove={() => removeRegionHero({ id: region.id })}
            />
          </div>
        </Section>
      )}

      <SaveBar
        pending={pending}
        dirty={dirty}
        label={mode === "create" ? "Bölgeyi ekle" : "Kaydet"}
      />
    </form>
  );
}
