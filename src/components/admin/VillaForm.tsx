"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateVilla, createVilla } from "@/lib/actions/admin/villas";
import {
  amenityOptions,
  poolOptions,
  dealTagOptions,
  statusOptions,
} from "@/lib/adminMeta";
import { slugify } from "@/lib/slugify";
import { Field, Section } from "@/components/admin/ui/FormField";
import SaveBar from "@/components/admin/ui/SaveBar";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { useUnsavedGuard } from "@/components/admin/ui/useUnsavedGuard";
import { inputCls } from "@/components/admin/ui/styles";
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
  distanceAirportKm: string;
  distanceMarketKm: string;
  distanceRestaurantKm: string;
  distanceTransitKm: string;
  distanceCenterKm: string;
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
    distanceAirportKm: v?.distanceAirportKm != null ? String(v.distanceAirportKm) : "",
    distanceMarketKm: v?.distanceMarketKm != null ? String(v.distanceMarketKm) : "",
    distanceRestaurantKm:
      v?.distanceRestaurantKm != null ? String(v.distanceRestaurantKm) : "",
    distanceTransitKm: v?.distanceTransitKm != null ? String(v.distanceTransitKm) : "",
    distanceCenterKm: v?.distanceCenterKm != null ? String(v.distanceCenterKm) : "",
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
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const [saved, setSaved] = useState<FormState>(() => fromVilla(villa));
  const [f, setF] = useState<FormState>(() => fromVilla(villa));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = useMemo(
    () => JSON.stringify(f) !== JSON.stringify(saved),
    [f, saved]
  );
  useUnsavedGuard(dirty);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    // Kullanıcı alana dokununca o alanın hatası kalksın.
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const toggleAmenity = (key: string) =>
    setF((p) => ({
      ...p,
      amenities: p.amenities.includes(key)
        ? p.amenities.filter((a) => a !== key)
        : [...p.amenities, key],
    }));

  const submit = async () => {
    // Arşivleme yıkıcı bir işlem: villa siteden kalkar (panel-kurallari §3).
    if (f.status === "archived" && saved.status !== "archived") {
      const ok = await confirm({
        title: "Villa arşivlensin mi?",
        body: "Arşivlenen villa siteden kalkar ve aramalarda görünmez. Kayıt silinmez; durumu yeniden 'Yayında' yaparak geri alabilirsiniz.",
        confirmLabel: "Arşivle",
        tone: "danger",
      });
      if (!ok) return;
    }

    setErrors({});
    start(async () => {
      const payload = { ...f };
      const res =
        mode === "edit" && villa
          ? await updateVilla({ id: villa.id, ...payload })
          : await createVilla(payload);

      if (res.ok) {
        if (mode === "create") {
          toast.success("Villa oluşturuldu.");
          setSaved(payload); // çıkış uyarısı tetiklenmesin
          router.push(`/yonetim/villalar/${res.id}`);
        } else {
          setSaved(payload);
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
        void submit();
      }}
      className="space-y-5"
    >
      <Section title="Temel Bilgi">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Villa adı" required error={errors.name}>
            <input
              className={inputCls}
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
            hint="URL'de görünür, benzersiz olmalı. Ör. villa-deniz-kalkan"
          >
            <input
              className={inputCls}
              value={f.slug}
              onChange={(e) => set("slug", e.target.value)}
            />
          </Field>
          <Field label="Bölge" required error={errors.regionId}>
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
          <Field
            label="Durum"
            error={errors.status}
            hint="Yalnızca 'Yayında' olan villalar sitede görünür."
          >
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

      <Section title="Kapasite ve Konaklama">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Kapasite (kişi)" required error={errors.capacity}>
            <input type="number" min={1} className={inputCls} value={f.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </Field>
          <Field label="Yatak odası" error={errors.bedrooms}>
            <input type="number" min={0} className={inputCls} value={f.bedrooms} onChange={(e) => set("bedrooms", e.target.value)} />
          </Field>
          <Field label="Banyo" error={errors.bathrooms}>
            <input type="number" min={0} className={inputCls} value={f.bathrooms} onChange={(e) => set("bathrooms", e.target.value)} />
          </Field>
          <Field label="Havuz" error={errors.pool}>
            <select className={inputCls} value={f.pool} onChange={(e) => set("pool", e.target.value)}>
              {poolOptions.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Büyüklük (m²)" error={errors.sizeM2}>
            <input type="number" min={0} className={inputCls} value={f.sizeM2} onChange={(e) => set("sizeM2", e.target.value)} />
          </Field>
          <Field label="Denize uzaklık (m)" error={errors.distanceToSea}>
            <input type="number" min={0} className={inputCls} value={f.distanceToSea} onChange={(e) => set("distanceToSea", e.target.value)} />
          </Field>
          <Field
            label="Min. gece"
            required
            error={errors.minNights}
            hint="Bu sayının altında rezervasyon talebi gönderilemez."
          >
            <input type="number" min={1} className={inputCls} value={f.minNights} onChange={(e) => set("minNights", e.target.value)} />
          </Field>
          <Field label="Giriş saati" required error={errors.checkIn}>
            <input type="time" className={inputCls} value={f.checkIn} onChange={(e) => set("checkIn", e.target.value)} />
          </Field>
          <Field label="Çıkış saati" required error={errors.checkOut}>
            <input type="time" className={inputCls} value={f.checkOut} onChange={(e) => set("checkOut", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Mesafe Cetveli"
        description="Villa sayfasında güven veren pratik bilgiler. Boş bırakılan satır gösterilmez; deniz mesafesi yukarıdaki 'Denize uzaklık' alanından geliyor."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Havaalanı (km)" error={errors.distanceAirportKm}>
            <input type="number" min={0} className={inputCls} value={f.distanceAirportKm} onChange={(e) => set("distanceAirportKm", e.target.value)} />
          </Field>
          <Field label="Market (km)" error={errors.distanceMarketKm}>
            <input type="number" min={0} className={inputCls} value={f.distanceMarketKm} onChange={(e) => set("distanceMarketKm", e.target.value)} />
          </Field>
          <Field label="Restoran (km)" error={errors.distanceRestaurantKm}>
            <input type="number" min={0} className={inputCls} value={f.distanceRestaurantKm} onChange={(e) => set("distanceRestaurantKm", e.target.value)} />
          </Field>
          <Field label="Toplu taşıma (km)" error={errors.distanceTransitKm}>
            <input type="number" min={0} className={inputCls} value={f.distanceTransitKm} onChange={(e) => set("distanceTransitKm", e.target.value)} />
          </Field>
          <Field label="Şehir merkezi (km)" error={errors.distanceCenterKm}>
            <input type="number" min={0} className={inputCls} value={f.distanceCenterKm} onChange={(e) => set("distanceCenterKm", e.target.value)} />
          </Field>
        </div>
      </Section>

      <Section
        title="Fiyatlandırma"
        description="Sezon fiyatı tanımlıysa o tarihlerde sezon fiyatı geçerlidir; taban fiyat geri kalan günlerde kullanılır."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Taban gecelik fiyat (₺)" required error={errors.basePrice}>
            <input type="number" min={0} className={inputCls} value={f.basePrice} onChange={(e) => set("basePrice", e.target.value)} />
          </Field>
          <Field
            label="Temizlik bedeli (₺)"
            error={errors.cleaningFee}
            hint="Konaklama başına bir kez eklenir."
          >
            <input type="number" min={0} className={inputCls} value={f.cleaningFee} onChange={(e) => set("cleaningFee", e.target.value)} />
          </Field>
          <Field label="Hizmet oranı" error={errors.serviceRate} hint="Ör. 0.05 = %5">
            <input type="number" step="0.01" min={0} max={1} className={inputCls} value={f.serviceRate} onChange={(e) => set("serviceRate", e.target.value)} />
          </Field>
          <Field label="İndirim %" error={errors.discountPercent} hint="Boş = indirim yok">
            <input type="number" min={0} max={90} className={inputCls} value={f.discountPercent} onChange={(e) => set("discountPercent", e.target.value)} />
          </Field>
          <Field
            label="Fırsat etiketi"
            error={errors.dealTag}
            hint="Villa kartında rozet olarak görünür."
          >
            <select className={inputCls} value={f.dealTag} onChange={(e) => set("dealTag", e.target.value)}>
              {dealTagOptions.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Field>
        </div>
      </Section>

      <Section
        title="Değerlendirme ve Vitrin"
        description="Yorum sistemi devreye girene kadar bu değerler elle girilir ve villa kartında yıldız olarak görünür."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Puan (0-5)" error={errors.rating}>
            <input type="number" step="0.1" min={0} max={5} className={inputCls} value={f.rating} onChange={(e) => set("rating", e.target.value)} />
          </Field>
          <Field label="Yorum sayısı" error={errors.reviewCount}>
            <input type="number" min={0} className={inputCls} value={f.reviewCount} onChange={(e) => set("reviewCount", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 self-end pb-2">
            <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 rounded border-sand-300 text-brand-600" />
            <span className="text-sm font-semibold text-brand-900">
              Ana sayfada öne çıkar
            </span>
          </label>
        </div>
      </Section>

      <Section title="Açıklamalar">
        <div className="grid gap-4">
          <Field label="Açıklama (Türkçe)" error={errors.descriptionTr}>
            <textarea rows={4} className={inputCls} value={f.descriptionTr} onChange={(e) => set("descriptionTr", e.target.value)} />
          </Field>
          <Field label="Açıklama (İngilizce)" error={errors.descriptionEn}>
            <textarea rows={4} className={inputCls} value={f.descriptionEn} onChange={(e) => set("descriptionEn", e.target.value)} />
          </Field>
          <Field
            label="Video bağlantısı (YouTube embed)"
            error={errors.videoUrl}
            hint="Opsiyonel. Paylaş bağlantısı değil, embed bağlantısı olmalı."
          >
            <input className={inputCls} value={f.videoUrl} onChange={(e) => set("videoUrl", e.target.value)} placeholder="https://www.youtube.com/embed/…" />
          </Field>
        </div>
      </Section>

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

      <SaveBar
        pending={pending}
        dirty={dirty}
        label={mode === "create" ? "Villa Oluştur" : "Kaydet"}
      />
    </form>
  );
}
