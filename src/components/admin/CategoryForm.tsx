"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, CheckCircle2 } from "lucide-react";
import {
  createCategory,
  updateCategory,
  setCategoryVillas,
} from "@/lib/actions/admin/categories";
import { categoryColorOptions, categoryIconOptions } from "@/lib/adminMeta";
import type {
  AdminCategoryFull,
  VillaPick,
} from "@/lib/data/admin/categories";

const inputCls =
  "w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelCls = "mb-1 block text-xs font-semibold text-brand-900/60";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export default function CategoryForm({
  category,
  villas,
  mode,
}: {
  category: AdminCategoryFull | null;
  villas: VillaPick[];
  mode: "edit" | "create";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [f, setF] = useState({
    nameTr: category?.nameTr ?? "",
    nameEn: category?.nameEn ?? "",
    slug: category?.slug ?? "",
    descTr: category?.descTr ?? "",
    descEn: category?.descEn ?? "",
    color: category?.color ?? "sky",
    icon: category?.icon ?? "WavesHorizontal",
    image: category?.image ?? "",
    featuredOnHome: category?.featuredOnHome ?? false,
  });
  const [villaIds, setVillaIds] = useState<string[]>(category?.villaIds ?? []);

  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const toggleVilla = (id: string) =>
    setVillaIds((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id]
    );

  const save = () => {
    setMsg(null);
    start(async () => {
      const res =
        mode === "edit" && category
          ? await updateCategory({ id: category.id, ...f })
          : await createCategory(f);
      if (!res.ok) {
        setMsg({
          ok: false,
          text:
            res.error === "slug"
              ? "Bu kısa ad başka kategoride kullanılıyor."
              : "Kaydedilemedi. Alanları kontrol edin.",
        });
        return;
      }
      const catId = res.id!;
      await setCategoryVillas({ categoryId: catId, villaIds });
      if (mode === "create") {
        router.push("/yonetim/kategoriler");
      } else {
        setMsg({ ok: true, text: "Kaydedildi." });
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="mb-4 text-base font-bold text-brand-950">Kategori Bilgisi</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Ad (Türkçe)</span>
            <input
              className={inputCls}
              value={f.nameTr}
              onChange={(e) => {
                set("nameTr", e.target.value);
                if (mode === "create") set("slug", slugify(e.target.value));
              }}
            />
          </label>
          <label className="block">
            <span className={labelCls}>Ad (İngilizce)</span>
            <input className={inputCls} value={f.nameEn} onChange={(e) => set("nameEn", e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Kısa ad (slug)</span>
            <input className={inputCls} value={f.slug} onChange={(e) => set("slug", e.target.value)} />
          </label>
          <label className="block">
            <span className={labelCls}>Renk</span>
            <select className={inputCls} value={f.color} onChange={(e) => set("color", e.target.value)}>
              {categoryColorOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>İkon</span>
            <select className={inputCls} value={f.icon} onChange={(e) => set("icon", e.target.value)}>
              {categoryIconOptions.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={labelCls}>Görsel URL (opsiyonel)</span>
            <input className={inputCls} value={f.image} onChange={(e) => set("image", e.target.value)} placeholder="https://…" />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Açıklama (Türkçe)</span>
            <input className={inputCls} value={f.descTr} onChange={(e) => set("descTr", e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className={labelCls}>Açıklama (İngilizce)</span>
            <input className={inputCls} value={f.descEn} onChange={(e) => set("descEn", e.target.value)} />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" checked={f.featuredOnHome} onChange={(e) => set("featuredOnHome", e.target.checked)} className="h-4 w-4 rounded border-sand-300 text-brand-600" />
            <span className="text-sm font-semibold text-brand-900">Ana sayfada satır olarak göster</span>
          </label>
        </div>
      </section>

      {/* Villa atama */}
      <section className="rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-base font-bold text-brand-950">
          Kategorideki Villalar
          <span className="ml-2 text-sm font-normal text-brand-900/50">
            {villaIds.length} seçili
          </span>
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {villas.map((v) => (
            <label key={v.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sand-50">
              <input type="checkbox" checked={villaIds.includes(v.id)} onChange={() => toggleVilla(v.id)} className="h-4 w-4 rounded border-sand-300 text-brand-600" />
              <span className="text-brand-900">{v.name}</span>
            </label>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between gap-3 border-t border-sand-200 bg-white/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        {msg ? (
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>
            {msg.ok && <CheckCircle2 className="h-4 w-4" />}
            {msg.text}
          </span>
        ) : (
          <span />
        )}
        <button
          onClick={save}
          disabled={pending}
          className="inline-flex items-center gap-2 rounded-xl bg-sun-500 px-6 py-2.5 font-bold text-white shadow-sm transition hover:bg-sun-600 disabled:bg-sand-200"
        >
          {pending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          {mode === "create" ? "Kategori Oluştur" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
