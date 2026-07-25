"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, CheckCircle2 } from "lucide-react";
import { updateVilla, createVilla } from "@/lib/actions/admin/villas";
import {
  amenityOptions,
  poolOptions,
  dealTagOptions,
  statusOptions,
} from "@/lib/adminMeta";
import type { AdminVillaFull } from "@/lib/data/admin/villas";
import type { RegionOption } from "@/lib/data/admin/regions";

type FormState = {
  name: string;
  slug: string;
  regionId: string;
  status: string;
  capacity: string;
  bedrooms: string;
  bathrooms: string;
  pool: string;
  sizeM2: string;
  distanceToSea: string;
  rating: string;
  reviewCount: string;
  featured: boolean;
  discountPercent: string;
  dealTag: string;
  checkIn: string;
  checkOut: string;
  minNights: string;
  basePrice: string;
  cleaningFee: string;
  serviceRate: string;
  descriptionTr: string;
  descriptionEn: string;
  videoUrl: string;
  amenities: string[];
};

function fromVilla(v: AdminVillaFull | null): FormState {
  return {
    name: v?.name ?? "",
    slug: v?.slug ?? "",
    regionId: v?.regionId ?? "",
    status: v?.status ?? "draft",
    capacity: String(v?.capacity ?? 2),
    bedrooms: String(v?.bedrooms ?? 1),
    bathrooms: String(v?.bathrooms ?? 1),
    pool: v?.pool ?? "private",
    sizeM2: String(v?.sizeM2 ?? 0),
    distanceToSea: String(v?.distanceToSea ?? 0),
    rating: String(v?.rating ?? 0),
    reviewCount: String(v?.reviewCount ?? 0),
    featured: v?.featured ?? false,
    discountPercent: v?.discountPercent != null ? String(v.discountPercent) : "",
    dealTag: v?.dealTag ?? "",
    checkIn: v?.checkIn ?? "16:00",
    checkOut: v?.checkOut ?? "10:00",
    minNights: String(v?.minNights ?? 1),
    basePrice: String(v?.basePrice ?? 0),
    cleaningFee: String(v?.cleaningFee ?? 0),
    serviceRate: String(v?.serviceRate ?? 0.05),
    descriptionTr: v?.descriptionTr ?? "",
    descriptionEn: v?.descriptionEn ?? "",
    videoUrl: v?.videoUrl ?? "",
    amenities: v?.amenities ?? [],
  };
}

const inputCls =
  "w-full rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm text-brand-950 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";
const labelCls = "mb-1 block text-xs font-semibold text-brand-900/60";

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-brand-900/40">{hint}</span>}
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="mb-4 text-base font-bold text-brand-950">{title}</h2>
      {children}
    </section>
  );
}

export default function VillaForm({
  villa,
  regions,
  mode,
}: {
  villa: AdminVillaFull | null;
  regions: RegionOption[];
  mode: "edit" | "create";
}) {
  const router = useRouter();
  const [f, setF] = useState<FormState>(() => fromVilla(villa));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const toggleAmenity = (key: string) =>
    setF((p) => ({
      ...p,
      amenities: p.amenities.includes(key)
        ? p.amenities.filter((a) => a !== key)
        : [...p.amenities, key],
    }));

  const slugify = (s: string) =>
    s
      .toLowerCase()
      .replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g")
      .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

  const save = () => {
    setMsg(null);
    start(async () => {
      const payload = { ...f };
      const res =
        mode === "edit" && villa
          ? await updateVilla({ id: villa.id, ...payload })
          : await createVilla(payload);
      if (res.ok) {
        if (mode === "create") {
          router.push(`/yonetim/villalar/${res.id}`);
        } else {
          setMsg({ ok: true, text: "Kaydedildi." });
          router.refresh();
        }
      } else {
        setMsg({
          ok: false,
          text:
            res.error === "slug"
              ? "Bu kısa ad (slug) başka villada kullanılıyor."
              : res.error === "validation"
                ? "Bilgileri kontrol edin (zorunlu alanlar, tarih/fiyat biçimi)."
                : "Kaydedilemedi.",
        });
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Temel bilgi */}
      <Section title="Temel Bilgi">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Villa adı">
            <input
              className={inputCls}
              value={f.name}
              onChange={(e) => {
                set("name", e.target.value);
                if (mode === "create") set("slug", slugify(e.target.value));
              }}
            />
          </Field>
          <Field label="Kısa ad (slug)" hint="URL'de görünür, benzersiz olmalı">
            <input
              className={inputCls}
              value={f.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
          </Field>
          <Field label="Bölge">
            <select
              className={inputCls}
              value={f.regionId}
              onChange={(e) => set("regionId", e.target.value)}
            >
              <option value="">Seçin…</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}, {r.province}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Durum">
            <select
              className={inputCls}
              value={f.status}
              onChange={(e) => set("status", e.target.value)}
            >
              {statusOptions.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Kapasite & konaklama */}
      <Section title="Kapasite ve Konaklama">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kapasite (kişi)">
            <input type="number" min={1} className={inputCls} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </Field>
          <Field label="Yatak odası">
            <input type="number" min={0} className={inputCls} value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
          </Field>
          <Field label="Banyo">
            <input type="number" min={0} className={inputCls} value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
          </Field>
          <Field label="Havuz">
            <select className={inputCls} value={f.pool} onChange={(e) => set("pool", e.target.value)}>
              {poolOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Büyüklük (m²)">
            <input type="number" min={0} className={inputCls} value={f.sizeM2} onChange={(e) => set("sizeM2", e.target.value)} />
          </Field>
          <Field label="Denize uzaklık (m)">
            <input type="number" min={0} className={inputCls} value={f.distanceToSea} onChange={(e) => set("distanceToSea", e.target.value)} />
          </Field>
          <Field label="Min. gece">
            <input type="number" min={1} className={inputCls} value={f.minNights} onChange={(e) => set("minNights", e.target.value)} />
          </Field>
          <Field label="Giriş saati">
            <input type="time" className={inputCls} value={f.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
          </Field>
          <Field label="Çıkış saati">
            <input type="time" className={inputCls} value={f.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
          </Field>
        </div>
      </Section>

      {/* Fiyatlandırma */}
      <Section title="Fiyatlandırma">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Taban gecelik fiyat (₺)">
            <input type="number" min={0} className={inputCls} value={f.basePrice} onChange={(e) => set("basePrice", e.target.value)} />
          </Field>
          <Field label="Temizlik bedeli (₺)">
            <input type="number" min={0} className={inputCls} value={f.cleaningFee} onChange={(e) => set("cleaningFee", e.target.value)} />
          </Field>
          <Field label="Hizmet oranı" hint="Ör. 0.05 = %5">
            <input type="number" step="0.01" min={0} max={1} className={inputCls} value={f.serviceRate} onChange={(e) => set("serviceRate", e.target.value)} />
          </Field>
          <Field label="İndirim %" hint="Boş = indirim yok">
            <input type="number" min={0} max={90} className={inputCls} value={f.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} />
          </Field>
          <Field label="Fırsat etiketi">
            <select className={inputCls} value={f.dealTag} onChange={(e) => set("dealTag", e.target.value)}>
              {dealTagOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      {/* Değerlendirme & vitrin */}
      <Section title="Değerlendirme ve Vitrin">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Puan (0-5)">
            <input type="number" step="0.1" min={0} max={5} className={inputCls} value={f.rating} onChange={(e) => set("rating", e.target.value)} />
          </Field>
          <Field label="Yorum sayısı">
            <input type="number" min={0} className={inputCls} value={f.reviewCount} onChange={(e) => set("reviewCount", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 rounded border-sand-300 text-brand-600" />
            <span className="text-sm font-semibold text-brand-900">Öne çıkan villa</span>
          </label>
        </div>
      </Section>

      {/* Açıklamalar */}
      <Section title="Açıklamalar">
        <div className="grid gap-4">
          <Field label="Açıklama (Türkçe)">
            <textarea rows={4} className={inputCls} value={f.descriptionTr} onChange={(e) => set("descriptionTr", e.target.value)} />
          </Field>
          <Field label="Açıklama (İngilizce)">
            <textarea rows={4} className={inputCls} value={f.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
          </Field>
          <Field label="Video bağlantısı (YouTube embed)" hint="Opsiyonel">
            <input className={inputCls} value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://www.youtube.com/embed/…" />
          </Field>
        </div>
      </Section>

      {/* Olanaklar */}
      <Section title="Olanaklar">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {amenityOptions.map((a) => (
            <label key={a.key} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sand-50">
              <input type="checkbox" checked={f.amenities.includes(a.key)} onChange={() => toggleAmenity(a.key)} className="h-4 w-4 rounded border-sand-300 text-brand-600" />
              <span className="text-brand-900">{a.label}</span>
            </label>
          ))}
        </div>
      </Section>

      {/* Kaydet çubuğu */}
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
          {mode === "create" ? "Villa Oluştur" : "Kaydet"}
        </button>
      </div>
    </div>
  );
}
