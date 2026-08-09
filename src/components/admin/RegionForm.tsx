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
  parentId: string;
};

function fromRegion(r: AdminRegion | null, initialParentId?: string): FormState {
  return {
    name: r?.name ?? "",
    province: r?.province ?? "",
    slug: r?.slug ?? "",
    sortOrder: String(r?.sortOrder ?? 0),
    parentId: r?.parentId ?? initialParentId ?? "",
  };
}

export default function RegionForm({
  region,
  mode,
  parentOptions = [],
  initialParentId,
}: {
  region: AdminRegion | null;
  mode: "create" | "edit";
  parentOptions?: { id: string; label: string; depth: number }[];
  initialParentId?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const [saved, setSaved] = useState<FormState>(() =>
    fromRegion(region, initialParentId)
  );
  const [f, setF] = useState<FormState>(() =>
    fromRegion(region, initialParentId)
  );
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

  // Kendisini ve varsa çocuklarını parent olarak seçmesini engelle
  const availableParents = parentOptions.filter((p) => p.id !== region?.id);

  // Seçili parent'a göre eklenen kaydın türü (İl, İlçe, Bölge)
  const selectedParent = availableParents.find((p) => p.id === f.parentId);
  const currentDepth = selectedParent ? selectedParent.depth + 1 : 0;

  const levelName =
    currentDepth === 0
      ? "İl (Şehir)"
      : currentDepth === 1
      ? "İlçe"
      : currentDepth === 2
      ? "Bölge / Belde"
      : "Alt Bölge / Özel Bölge / Mevki";

  const submit = () => {
    setErrors({});
    start(async () => {
      const payload = {
        name: f.name,
        province: f.province,
        slug: f.slug,
        sortOrder: Number(f.sortOrder),
        parentId: f.parentId || null,
      };

      const res =
        mode === "edit" && region
          ? await updateRegion({ id: region.id, ...payload })
          : await createRegion(payload);

      if (res.ok) {
        setSaved(f);
        if (mode === "create") {
          toast.success(`${levelName} eklendi.`);
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
      <Section title={`${levelName} Bilgisi`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Üst Konum (İl, İlçe veya Bölge)"
            error={errors.parentId}
            hint="İl eklemek için boş bırakın. İlçe için İl, Bölge için İlçe, Alt Bölge/Mevki için Bölge (Örn: Kalkan) seçin."
          >
            <select
              className={inputCls}
              value={f.parentId}
              onChange={(e) => set("parentId", e.target.value)}
            >
              <option value="">-- İl / Şehir Ekle (Üst Konum Yok) --</option>
              {availableParents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`${levelName} Adı`} required error={errors.name}>
            <input
              className={inputCls}
              placeholder={
                currentDepth === 0
                  ? "Ör. Antalya, Muğla"
                  : currentDepth === 1
                  ? "Ör. Kaş, Fethiye"
                  : "Ör. Kalkan, İslamlar"
              }
              value={f.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (mode === "create") set("slug", slugify(e.target.value));
              }}
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
              alt={`${region.name} görseli`}
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
        label={mode === "create" ? `${levelName} Ekle` : "Kaydet"}
      />
    </form>
  );
}
