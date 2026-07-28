"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, X } from "lucide-react";
import {
  createRegion,
  updateRegion,
  deleteRegion,
  uploadRegionHero,
  removeRegionHero,
} from "@/lib/actions/admin/regions";
import ImageUploadField from "@/components/admin/ImageUploadField";
import type { AdminRegion } from "@/lib/data/admin/regions";

const empty = { name: "", province: "", slug: "", sortOrder: "0" };

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const inputCls =
  "w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

export default function RegionsManager({
  regions,
}: {
  regions: AdminRegion[];
}) {
  const router = useRouter();
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (k: keyof typeof empty, v: string) =>
    setF((p) => ({ ...p, [k]: v }));

  const editing = regions.find((r) => r.id === editId) ?? null;

  const startEdit = (r: AdminRegion) => {
    setError(null);
    setEditId(r.id);
    setF({
      name: r.name,
      province: r.province,
      slug: r.slug,
      sortOrder: String(r.sortOrder),
    });
  };

  const reset = () => {
    setEditId(null);
    setF(empty);
    setError(null);
  };

  const save = () => {
    setError(null);
    start(async () => {
      const payload = { ...f };
      const res = editId
        ? await updateRegion({ id: editId, ...payload })
        : await createRegion(payload);
      if (res.ok) {
        reset();
        router.refresh();
      } else {
        setError(
          res.error === "slug"
            ? "Bu kısa ad başka bölgede kullanılıyor."
            : "Kaydedilemedi. Alanları kontrol edin."
        );
      }
    });
  };

  const remove = (r: AdminRegion) => {
    if (r.villaCount > 0) {
      setError(`${r.name} bölgesinde ${r.villaCount} villa var, önce onları taşıyın.`);
      return;
    }
    if (!window.confirm(`${r.name} bölgesini silmek istiyor musunuz?`)) return;
    setError(null);
    start(async () => {
      const res = await deleteRegion({ id: r.id });
      if (res.ok) router.refresh();
      else
        setError(
          res.error === "inuse"
            ? "Bu bölgeye bağlı villa var, silinemez."
            : "Silinemedi."
        );
    });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Liste */}
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
                <div className="text-sm text-brand-900/55">
                  {r.province} · {r.villaCount} villa · #{r.sortOrder}
                </div>
              </div>
              <button
                onClick={() => startEdit(r)}
                className="rounded-lg p-1.5 text-brand-700 hover:bg-sand-100"
                aria-label="Düzenle"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(r)}
                disabled={pending}
                className="rounded-lg p-1.5 text-brand-900/40 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {regions.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-brand-900/45">
              Henüz bölge yok.
            </li>
          )}
        </ul>
      </div>

      {/* Form */}
      <div className="rounded-2xl border border-sand-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-950">
            {editId ? "Bölgeyi Düzenle" : "Yeni Bölge"}
          </h2>
          {editId && (
            <button
              onClick={reset}
              className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              <X className="h-3.5 w-3.5" /> Vazgeç
            </button>
          )}
        </div>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand-900/60">Bölge adı</span>
            <input
              className={inputCls}
              value={f.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (!editId) set("slug", slugify(e.target.value));
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand-900/60">İl</span>
            <input className={inputCls} value={f.province} onChange={(e) => set("province", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand-900/60">Kısa ad (slug)</span>
            <input className={inputCls} value={f.slug} onChange={(e) => set("slug", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-brand-900/60">Sıra</span>
            <input type="number" min={0} className={inputCls} value={f.sortOrder} onChange={(e) => set("sortOrder", e.target.value)} />
          </label>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            onClick={save}
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sun-500 py-2.5 font-bold text-white transition hover:bg-sun-600 disabled:bg-sand-200"
          >
            {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            {editId ? "Kaydet" : "Ekle"}
          </button>
        </div>

        {/* Kart görseli — ancak bölge kaydedildikten sonra yüklenebilir */}
        <div className="mt-5 border-t border-sand-100 pt-4">
          <h3 className="text-xs font-semibold text-brand-900/60">
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
              <p className="mt-2 text-xs text-brand-900/45">
                Yüklenmezse kart, bu bölgedeki bir villanın fotoğrafını
                kullanır.
              </p>
            </div>
          ) : (
            <p className="mt-2 text-xs text-brand-900/45">
              Görsel yüklemek için listeden bir bölge seçin.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
