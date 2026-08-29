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
import type { CategoryOption } from "@/lib/data/admin/categories";
import CascadeRegionSelect from "@/components/admin/CascadeRegionSelect";

type FormState = {
  name: string;
  slug: string;
  regionId: string;
  status: string;
  capacity: string;
  bedrooms: string;
  bathrooms: string;
  pool: string;
  poolWidth: string;
  poolLength: string;
  poolDepth: string;
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
  damageDeposit: string;
  ministryCertNo: string;
  serviceRate: string;
  weekendPremiumPercent: string;
  losWeeklyDiscountPercent: string;
  losMonthlyDiscountPercent: string;
  lastMinuteDiscountPercent: string;
  lastMinuteDays: string;
  extraGuestFee: string;
  extraGuestAfter: string;
  descriptionTr: string;
  descriptionEn: string;
  videoUrl: string;
  amenities: string[];
  categoryIds: string[];
};

/** Sayısal opsiyonel alanı forma çevirir: null/0 → boş (kural uygulanmaz). */
const str = (n: number | null | undefined) =>
  n != null && n !== 0 ? String(n) : "";

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
    poolWidth: str(v?.poolWidth),
    poolLength: str(v?.poolLength),
    poolDepth: str(v?.poolDepth),
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
    damageDeposit: str(v?.damageDeposit),
    ministryCertNo: v?.ministryCertNo ?? "",
    serviceRate: String(v?.serviceRate ?? 0.05),
    weekendPremiumPercent: str(v?.weekendPremiumPercent),
    losWeeklyDiscountPercent: str(v?.losWeeklyDiscountPercent),
    losMonthlyDiscountPercent: str(v?.losMonthlyDiscountPercent),
    lastMinuteDiscountPercent: str(v?.lastMinuteDiscountPercent),
    lastMinuteDays: str(v?.lastMinuteDays),
    extraGuestFee: str(v?.extraGuestFee),
    extraGuestAfter: str(v?.extraGuestAfter),
    descriptionTr: v?.descriptionTr ?? "",
    descriptionEn: v?.descriptionEn ?? "",
    videoUrl: v?.videoUrl ?? "",
    amenities: v?.amenities ?? [],
    categoryIds: v?.categoryIds ?? [],
  };
}

export default function VillaForm({
  villa,
  regions,
  categoryOptions,
  mode,
}: {
  villa: AdminVillaFull | null;
  regions: RegionOption[];
  categoryOptions: CategoryOption[];
  mode: "edit" | "create";
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const [saved, setSaved] = useState<FormState>(() => fromVilla(villa));
  const [f, setF] = useState<FormState>(() => fromVilla(villa));

  // Fiyat kuralları isteğe bağlı: villada tanımlı kural varsa açık başlar.
  const [showRules, setShowRules] = useState(() =>
    [
      villa?.weekendPremiumPercent,
      villa?.losWeeklyDiscountPercent,
      villa?.losMonthlyDiscountPercent,
      villa?.lastMinuteDiscountPercent,
      villa?.lastMinuteDays,
      villa?.extraGuestFee,
      villa?.extraGuestAfter,
    ].some((v) => v != null && v !== 0)
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = useMemo(
    () => JSON.stringify(f) !== JSON.stringify(saved),
    [f, saved]
  );

  /**
   * Fiyat kurallarının canlı örnek hesabı (yol haritası 4.3: "her kuralın
   * yanına canlı örnek koy"). Taban fiyata göre, kural değiştikçe güncellenir —
   * kullanıcı %15'in ne demek olduğunu rakamla görür, karmaşık hissetmez.
   */
  const ruleHint = useMemo(() => {
    const base = Number(f.basePrice) || 0;
    const tl = (n: number) =>
      new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(
        Math.round(n)
      ) + "₺";
    const pctExample = (v: string, up: boolean) => {
      const p = Number(v) || 0;
      if (base <= 0 || p <= 0) return "Boş = uygulanmaz";
      const res = up ? base * (1 + p / 100) : base * (1 - p / 100);
      return `${tl(base)} → ${tl(res)}`;
    };
    return {
      weekend: pctExample(f.weekendPremiumPercent, true),
      weekly: pctExample(f.losWeeklyDiscountPercent, false),
      monthly: pctExample(f.losMonthlyDiscountPercent, false),
      lastMinute: pctExample(f.lastMinuteDiscountPercent, false),
      extraGuest:
        Number(f.extraGuestFee) > 0
          ? `Kişi başı gece +${tl(Number(f.extraGuestFee))}`
          : "Boş = uygulanmaz",
    };
  }, [
    f.basePrice,
    f.weekendPremiumPercent,
    f.losWeeklyDiscountPercent,
    f.losMonthlyDiscountPercent,
    f.lastMinuteDiscountPercent,
    f.extraGuestFee,
  ]);

  /**
   * Sekmeler `hidden` ile ayakta tutulduğu için (Tabs.tsx) bu bileşen hiç
   * unmount olmuyor: "Görseller" sekmesinde yapılan bir işlem `router.refresh()`
   * çağırınca sunucudan yeni `villa` gelir ama `useState` başlatıcısı bir daha
   * çalışmaz — form bayat veri göstermeye devam ederdi.
   *
   * Kullanıcı henüz bir alana dokunmadıysa sessizce tazeleriz. Dokunduysa
   * yazdıklarını silmek doğru olmaz; o durumda kaydetmedeki `updated_at`
   * kontrolü devreye girip ezmeyi engelliyor.
   */
  const [version, setVersion] = useState(villa?.updatedAt ?? null);
  if (villa && villa.updatedAt !== version && !dirty) {
    const fresh = fromVilla(villa);
    setVersion(villa.updatedAt);
    setSaved(fresh);
    setF(fresh);
  }

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

  const toggleCategory = (id: string) =>
    setF((p) => ({
      ...p,
      categoryIds: p.categoryIds.includes(id)
        ? p.categoryIds.filter((c) => c !== id)
        : [...p.categoryIds, id],
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
          ? await updateVilla({
              id: villa.id,
              updatedAt: villa.updatedAt,
              ...payload,
            })
          : await createVilla(payload);

      if (res.ok) {
        // Kısmi başarı: kayıt var ama bir yan adım tutmadı (ör. kategori bağları).
        // Başarı mesajının yerine geçsin ki kullanıcı eksiği fark etsin.
        if (res.warning) toast.error(res.warning);

        if (mode === "create") {
          if (!res.warning) toast.success("Villa oluşturuldu.");
          setSaved(payload); // çıkış uyarısı tetiklenmesin
          // Kayıttan sonra doğrudan Görseller sekmesine: fotoğraf yükleme
          // villa oluşturmanın devamı gibi hissedilsin, ayrı bir adım gibi değil.
          router.push(`/yonetim/villalar/${res.id}?sekme=images`);
        } else {
          setSaved(payload);
          if (!res.warning) toast.success("Kaydedildi.");
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
            : res.error === "conflict"
              ? "Bu villa siz düzenlerken başka bir yerden kaydedilmiş. Değişiklikleriniz yazılmadı — sayfayı yenileyip tekrar uygulayın."
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
            <CascadeRegionSelect
              regions={regions}
              value={f.regionId}
              onChange={(id) => set("regionId", id)}
              error={errors.regionId}
            />
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
          <Field
            label="Bakanlık belge no"
            error={errors.ministryCertNo}
            hint="T.C. Kültür ve Turizm Bakanlığı işletme belgesi (ör. 48-6108). Villa sayfasında rozet olarak görünür. Boş = gösterilmez."
          >
            <input
              className={inputCls}
              value={f.ministryCertNo}
              placeholder="48-6108"
              onChange={(e) => set("ministryCertNo", e.target.value)}
            />
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
          <Field
            label="Hasar depozitosu (₺)"
            error={errors.damageDeposit}
            hint="Girişte alınır, sorunsuz çıkışta iade edilir. Boş = gösterilmez."
          >
            <input type="number" min={0} className={inputCls} value={f.damageDeposit} onChange={(e) => set("damageDeposit", e.target.value)} />
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

        {/* Fiyat kurallarını isteğe bağlı aç */}
        <label className="mt-4 inline-flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showRules}
            onChange={(e) => setShowRules(e.target.checked)}
            className="h-4 w-4 rounded border-sand-300 text-brand-600"
          />
          <span className="text-sm font-semibold text-brand-900">
            Fiyat kuralı ekle{" "}
            <span className="font-normal text-brand-900/55">
              (hafta sonu farkı, uzun konaklama / son dakika indirimi, kapasite üstü kişi)
            </span>
          </span>
        </label>
      </Section>

      {showRules && (
      <Section
        title="Fiyat kuralları"
        description="Hepsi isteğe bağlı. Boş bırakılan kural uygulanmaz. Taban fiyat üzerinden hesaplanır."
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Hafta sonu farkı (%)"
              error={errors.weekendPremiumPercent}
              hint={ruleHint.weekend}
            >
              <input type="number" min={0} max={100} className={inputCls} value={f.weekendPremiumPercent} onChange={(e) => set("weekendPremiumPercent", e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Kapasite üstü kişi ücreti (₺/gece)" error={errors.extraGuestFee} hint={ruleHint.extraGuest}>
                <input type="number" min={0} className={inputCls} value={f.extraGuestFee} onChange={(e) => set("extraGuestFee", e.target.value)} />
              </Field>
              <Field label="Şu kişiden sonra" error={errors.extraGuestAfter} hint="Ör. 6">
                <input type="number" min={1} className={inputCls} value={f.extraGuestAfter} onChange={(e) => set("extraGuestAfter", e.target.value)} />
              </Field>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Uzun konaklama: 7+ gece indirimi (%)" error={errors.losWeeklyDiscountPercent} hint={ruleHint.weekly}>
              <input type="number" min={0} max={90} className={inputCls} value={f.losWeeklyDiscountPercent} onChange={(e) => set("losWeeklyDiscountPercent", e.target.value)} />
            </Field>
            <Field label="Uzun konaklama: 28+ gece indirimi (%)" error={errors.losMonthlyDiscountPercent} hint={ruleHint.monthly}>
              <input type="number" min={0} max={90} className={inputCls} value={f.losMonthlyDiscountPercent} onChange={(e) => set("losMonthlyDiscountPercent", e.target.value)} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-md">
            <Field label="Son dakika indirimi (%)" error={errors.lastMinuteDiscountPercent} hint={ruleHint.lastMinute}>
              <input type="number" min={0} max={90} className={inputCls} value={f.lastMinuteDiscountPercent} onChange={(e) => set("lastMinuteDiscountPercent", e.target.value)} />
            </Field>
            <Field label="Girişe kaç gün kala" error={errors.lastMinuteDays} hint="Ör. 7">
              <input type="number" min={1} max={90} className={inputCls} value={f.lastMinuteDays} onChange={(e) => set("lastMinuteDays", e.target.value)} />
            </Field>
          </div>
        </div>
      </Section>
      )}

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

      {f.pool !== "none" && (
      <Section
        title="Havuz Bilgileri"
        description="Havuz ölçüleri (metre). Boş bırakılan alan villa sayfasında gösterilmez."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Havuz eni (m)" error={errors.poolWidth}>
            <input type="number" min={0} step="0.1" className={inputCls} value={f.poolWidth} onChange={(e) => set("poolWidth", e.target.value)} />
          </Field>
          <Field label="Havuz boyu (m)" error={errors.poolLength}>
            <input type="number" min={0} step="0.1" className={inputCls} value={f.poolLength} onChange={(e) => set("poolLength", e.target.value)} />
          </Field>
          <Field label="Havuz derinliği (m)" error={errors.poolDepth}>
            <input type="number" min={0} step="0.1" className={inputCls} value={f.poolDepth} onChange={(e) => set("poolDepth", e.target.value)} />
          </Field>
        </div>
      </Section>
      )}

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
        title="Kategoriler"
        description="Bu villanın ana sayfada ve filtrelerde hangi kategorilerde görüneceğini seçin. (Popüler, Son Dakika gibi otomatik bloklar kurala göre dolar, burada yer almaz.)"
      >
        {categoryOptions.length === 0 ? (
          <p className="text-sm text-brand-900/60">Henüz kategori tanımlı değil.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categoryOptions.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sand-50"
              >
                <input
                  type="checkbox"
                  checked={f.categoryIds.includes(c.id)}
                  onChange={() => toggleCategory(c.id)}
                  className="h-4 w-4 rounded border-sand-300 text-brand-600"
                />
                <span className="text-brand-900">{c.nameTr}</span>
              </label>
            ))}
          </div>
        )}
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

      <Section
        title="Kategoriler"
        description="Bu villanın ana sayfada ve filtrelerde hangi kategorilerde görüneceğini seçin. (Popüler, Son Dakika gibi otomatik bloklar kurala göre dolar, burada yer almaz.)"
      >
        {categoryOptions.length === 0 ? (
          <p className="text-sm text-brand-900/60">Henüz kategori tanımlı değil.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {categoryOptions.map((c) => (
              <label
                key={c.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sand-50"
              >
                <input
                  type="checkbox"
                  checked={f.categoryIds.includes(c.id)}
                  onChange={() => toggleCategory(c.id)}
                  className="h-4 w-4 rounded border-sand-300 text-brand-600"
                />
                <span className="text-brand-900">{c.nameTr}</span>
              </label>
            ))}
          </div>
        )}
      </Section>

      <SaveBar
        pending={pending}
        dirty={dirty}
        label={mode === "create" ? "Villa Oluştur" : "Kaydet"}
      />
    </form>
  );
}
