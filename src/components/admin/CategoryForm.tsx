"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createCategory,
  updateCategory,
  setCategoryVillas,
  uploadCategoryImage,
  removeCategoryImage,
} from "@/lib/actions/admin/categories";
import { categoryColorOptions, categoryIconOptions } from "@/lib/adminMeta";
import { slugify } from "@/lib/slugify";
import { Field, Section } from "@/components/admin/ui/FormField";
import SaveBar from "@/components/admin/ui/SaveBar";
import { useToast } from "@/components/admin/ui/Toast";
import { useUnsavedGuard } from "@/components/admin/ui/useUnsavedGuard";
import { inputCls } from "@/components/admin/ui/styles";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { imageUrl } from "@/lib/images/url";
import type { AdminCategoryFull } from "@/lib/data/admin/categories";
import type { VillaOption } from "@/lib/data/admin/villas";

export default function CategoryForm({
  category,
  villas,
  mode,
}: {
  category: AdminCategoryFull | null;
  villas: VillaOption[];
  mode: "edit" | "create";
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const initial = useMemo(
    () => ({
      nameTr: category?.nameTr ?? "",
      nameEn: category?.nameEn ?? "",
      slug: category?.slug ?? "",
      descTr: category?.descTr ?? "",
      descEn: category?.descEn ?? "",
      color: category?.color ?? "sky",
      icon: category?.icon ?? "WavesHorizontal",
      image: category?.image ?? "",
      featuredOnHome: category?.featuredOnHome ?? false,
    }),
    [category]
  );

  const [f, setF] = useState(initial);
  const [villaIds, setVillaIds] = useState<string[]>(category?.villaIds ?? []);
  const [saved, setSaved] = useState({
    f: initial,
    villaIds: category?.villaIds ?? [],
  });

  const dirty = useMemo(
    () =>
      JSON.stringify(f) !== JSON.stringify(saved.f) ||
      JSON.stringify([...villaIds].sort()) !==
        JSON.stringify([...saved.villaIds].sort()),
    [f, villaIds, saved]
  );
  useUnsavedGuard(dirty);

  // ImageUploadField yükleyince router.refresh() çağırır → category prop değişir.
  // f.image ve saved.f.image'ı senkronize et ki önizleme anında güncellensin
  // ve Kaydet basılınca eski/boş değer gönderilmesin.
  useEffect(() => {
    const newImage = category?.image ?? "";
    setF((p) => ({ ...p, image: newImage }));
    setSaved((p) => ({ ...p, f: { ...p.f, image: newImage } }));
  }, [category?.image]);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const toggleVilla = (id: string) =>
    setVillaIds((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );

  // Villa sayısı büyüdükçe onay kutusu listesi taranamaz hale geliyor.
  // Liste zaten yüklü olduğu için filtre istemcide: sunucuya gitmeden daralt.
  const [villaQuery, setVillaQuery] = useState("");
  const visibleVillas = useMemo(() => {
    const term = villaQuery.trim().toLocaleLowerCase("tr");
    if (!term) return villas;
    return villas.filter((v) => v.name.toLocaleLowerCase("tr").includes(term));
  }, [villas, villaQuery]);

  const submit = () => {
    setErrors({});
    start(async () => {
      const res =
        mode === "edit" && category
          ? await updateCategory({ id: category.id, ...f })
          : await createCategory(f);

      if (!res.ok) {
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
        return;
      }

      // İki ayrı yazma: kategori kaydı + villa ataması. Atomik değiller, bu
      // yüzden ikincinin sonucu ayrıca kontrol edilir — önceki sürüm sonucu
      // atıp koşulsuz "Kaydedildi." diyordu.
      const catId = res.id!;
      const link = await setCategoryVillas({ categoryId: catId, villaIds });
      if (!link.ok) {
        toast.error(
          "Kategori kaydedildi ancak villa ataması yapılamadı. Villaları tekrar seçip kaydedin."
        );
        router.refresh();
        return;
      }

      setSaved({ f, villaIds });
      if (mode === "create") {
        toast.success("Kategori oluşturuldu.");
        router.push("/yonetim/kategoriler");
      } else {
        toast.success("Kaydedildi.");
        router.refresh();
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
      <Section title="Kategori Bilgisi">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad (Türkçe)" required error={errors.nameTr}>
            <input
              className={inputCls}
              value={f.nameTr}
              onChange={(e) => {
                set("nameTr", e.target.value);
                if (mode === "create") set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Ad (İngilizce)" required error={errors.nameEn}>
            <input className={inputCls} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
          </Field>
          <Field
            label="Kısa ad (slug)"
            required
            error={errors.slug}
            hint="URL'de görünür, benzersiz olmalı."
          >
            <input className={inputCls} value={f.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label="Renk" error={errors.color}>
            <select className={inputCls} value={f.color} onChange={(e) => set("color", e.target.value)}>
              {categoryColorOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="İkon" error={errors.icon}>
            <select className={inputCls} value={f.icon} onChange={(e) => set("icon", e.target.value)}>
              {categoryIconOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Görsel" error={errors.image} hint="Opsiyonel — dosya yükleyin ya da URL girin." className="sm:col-span-2">
            {/* Edit modunda dosya yükleme + önizleme; create modunda henüz ID yok, sadece URL. */}
            {mode === "edit" && category ? (
              <div className="space-y-3">
                <ImageUploadField
                  url={imageUrl(f.image)}
                  alt={f.nameTr || "Kategori görseli"}
                  aspect="aspect-[16/7]"
                  onUpload={async (fd) => {
                    fd.set("categoryId", category.id);
                    return uploadCategoryImage(fd);
                  }}
                  onRemove={async () =>
                    removeCategoryImage({ categoryId: category.id })
                  }
                />
                <div>
                  <p className="mb-1 text-xs text-brand-900/55">Ya da doğrudan URL girin:</p>
                  <input
                    className={inputCls}
                    value={f.image}
                    onChange={(e) => set("image", e.target.value)}
                    placeholder="https://…"
                  />
                </div>
              </div>
            ) : (
              <input
                className={inputCls}
                value={f.image}
                onChange={(e) => set("image", e.target.value)}
                placeholder="https://…"
              />
            )}
          </Field>
          <Field label="Açıklama (Türkçe)" error={errors.descTr} className="sm:col-span-2">
            <input className={inputCls} value={f.descTr} onChange={(e) => set("descTr", e.target.value)} />
          </Field>
          <Field label="Açıklama (İngilizce)" error={errors.descEn} className="sm:col-span-2">
            <input className={inputCls} value={f.descEn} onChange={(e) => set("descEn", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={f.featuredOnHome} onChange={(e) => set("featuredOnHome", e.target.checked)} className="h-4 w-4 rounded border-sand-300 text-brand-600" />
            <span className="text-sm font-semibold text-brand-900">
              Ana sayfada satır olarak göster
            </span>
          </label>
        </div>
      </Section>

      <Section title={`Kategorideki Villalar — ${villaIds.length} seçili`}>
        {villas.length === 0 ? (
          <p className="text-sm text-brand-900/70">
            Henüz villa yok. Önce villa ekleyin, sonra buradan kategoriye
            atayabilirsiniz.
          </p>
        ) : (
          <>
            {villas.length > 8 && (
              <input
                type="search"
                value={villaQuery}
                onChange={(e) => setVillaQuery(e.target.value)}
                placeholder={`${villas.length} villa içinde ara`}
                aria-label="Villa ara"
                className={`${inputCls} mb-3`}
              />
            )}

            {visibleVillas.length === 0 ? (
              <p className="text-sm text-brand-900/70">
                &ldquo;{villaQuery}&rdquo; ile eşleşen villa yok. Seçili villalar
                korunuyor.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {visibleVillas.map((v) => (
                  <label key={v.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sand-50">
                    <input type="checkbox" checked={villaIds.includes(v.id)} onChange={() => toggleVilla(v.id)} className="h-4 w-4 rounded border-sand-300 text-brand-600" />
                    <span className="text-brand-900">{v.name}</span>
                  </label>
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      <SaveBar
        pending={pending}
        dirty={dirty}
        label={mode === "create" ? "Kategori Oluştur" : "Kaydet"}
      />
    </form>
  );
}
