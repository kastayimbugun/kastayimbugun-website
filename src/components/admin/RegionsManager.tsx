"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, X, MapPin } from "lucide-react";
import {
  createRegion,
  updateRegion,
  deleteRegion,
  uploadRegionHero,
  removeRegionHero,
} from "@/lib/actions/admin/regions";
import ImageUploadField from "@/components/admin/ImageUploadField";
import { slugify } from "@/lib/slugify";
import { Field } from "@/components/admin/ui/FormField";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { EmptyState } from "@/components/admin/ui/PageHeader";
import { btnPrimary, btnIcon, btnIconDanger, inputCls } from "@/components/admin/ui/styles";
import type { AdminRegion } from "@/lib/data/admin/regions";

const empty = { name: "", province: "", slug: "", sortOrder: "0" };

export default function RegionsManager({
  regions,
}: {
  regions: AdminRegion[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const formRef = useRef<HTMLDivElement>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const set = (k: keyof typeof empty, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const editing = regions.find((r) => r.id === editId) ?? null;

  const startEdit = (r: AdminRegion) => {
    setErrors({});
    setEditId(r.id);
    setF({
      name: r.name,
      province: r.province,
      slug: r.slug,
      sortOrder: String(r.sortOrder),
    });
    // Dar ekranda form listenin altına iner; kullanıcı "Düzenle"ye basınca
    // ekranda hiçbir şey değişmiş görünmüyordu.
    if (window.matchMedia("(max-width: 1023px)").matches) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const reset = () => {
    setEditId(null);
    setF(empty);
    setErrors({});
  };

  const save = () => {
    setErrors({});
    start(async () => {
      const payload = { ...f };
      const res = editId
        ? await updateRegion({ id: editId, ...payload })
        : await createRegion(payload);

      if (res.ok) {
        toast.success(editId ? "Bölge güncellendi." : "Bölge eklendi.");
        reset();
        router.refresh();
        return;
      }
      if (res.fields && Object.keys(res.fields).length > 0) {
        setErrors(res.fields);
        toast.error("Bazı alanlar eksik veya hatalı.");
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "Kaydedilemedi."
        );
      }
    });
  };

  const remove = async (r: AdminRegion) => {
    if (r.villaCount > 0) {
      toast.error(
        `${r.name} bölgesinde ${r.villaCount} villa var. Önce onları başka bölgeye taşıyın.`
      );
      return;
    }
    const ok = await confirm({
      title: "Bölge silinsin mi?",
      body: `"${r.name}" bölgesi kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      tone: "danger",
    });
    if (!ok) return;

    start(async () => {
      const res = await deleteRegion({ id: r.id });
      if (res.ok) {
        toast.success("Bölge silindi.");
        if (editId === r.id) reset();
        router.refresh();
      } else {
        toast.error(
          res.error === "inuse"
            ? "Bu bölgeye bağlı villa var, silinemez."
            : "Silinemedi."
        );
      }
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Liste */}
      {regions.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Henüz bölge yok"
          description="Villa ekleyebilmek için önce en az bir bölge tanımlamalısınız. Sağdaki formu kullanın."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sand-200 bg-white">
          <ul className="divide-y divide-sand-100">
            {regions.map((r) => (
              <li
                key={r.id}
                className={`flex items-center gap-3 px-4 py-3 ${
                  editId === r.id ? "bg-brand-50" : ""
                }`}
              >
                <div className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-sand-100">
                  {r.heroImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.heroImageUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-brand-900">{r.name}</div>
                  <div className="text-sm text-brand-900/70">
                    {r.province} · {r.villaCount} villa · #{r.sortOrder}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(r)}
                  className={btnIcon}
                  aria-label={`${r.name} bölgesini düzenle`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(r)}
                  disabled={pending}
                  className={btnIconDanger}
                  aria-label={`${r.name} bölgesini sil`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Form */}
      <div
        ref={formRef}
        className="scroll-mt-4 rounded-2xl border border-sand-200 bg-white p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-950">
            {editId ? "Bölgeyi Düzenle" : "Yeni Bölge"}
          </h2>
          {editId && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1 rounded text-sm font-semibold text-brand-700 hover:underline focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <X className="h-3.5 w-3.5" /> Vazgeç
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
          className="space-y-3"
        >
          <Field label="Bölge adı" required error={errors.name}>
            <input
              className={inputCls}
              value={f.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!editId) set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="İl" required error={errors.province}>
            <input className={inputCls} value={f.province} onChange={(e) => set("province", e.target.value)} />
          </Field>
          <Field
            label="Kısa ad (slug)"
            required
            error={errors.slug}
            hint="URL'de görünür, benzersiz olmalı."
          >
            <input className={inputCls} value={f.slug} onChange={(e) => set("slug", e.target.value)} />
          </Field>
          <Field label="Sıra" error={errors.sortOrder} hint="Küçük sayı önce görünür.">
            <input type="number" min={0} className={inputCls} value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
          </Field>

          <button type="submit" disabled={pending} className={`${btnPrimary} w-full`}>
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            {editId ? "Kaydet" : "Ekle"}
          </button>
        </form>

        {/* Kart görseli — ancak bölge kaydedildikten sonra yüklenebilir */}
        <div className="mt-5 border-t border-sand-100 pt-4">
          <h3 className="text-xs font-semibold text-brand-900/70">
            Ana sayfadaki kart görseli
          </h3>
          {editing ? (
            <div className="mt-2">
              <ImageUploadField
                url={editing.heroImageUrl}
                alt={`${editing.name} bölge görseli`}
                onUpload={(fd) => {
                  fd.set("regionId", editing.id);
                  return uploadRegionHero(fd);
                }}
                onRemove={() => removeRegionHero({ id: editing.id })}
              />
              <p className="mt-2 text-xs text-brand-900/70">
                Yüklenmezse kart, bu bölgedeki bir villanın fotoğrafını kullanır.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-brand-900/70">
              Görsel yüklemek için listeden bir bölge seçin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
