"use client";

import React from "react";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GripVertical, Droplets, Image as ImageIcon } from "lucide-react";
import ImageUploadField from "@/components/admin/ImageUploadField";
import Tabs from "@/components/admin/Tabs";
import {
  uploadSiteHero,
  removeSiteHero,
  uploadSiteLogo,
  removeSiteLogo,
  uploadSiteOgImage,
  removeSiteOgImage,
  uploadAdWebImage,
  removeAdWebImage,
  uploadAdMobileImage,
  removeAdMobileImage,
  saveSiteSettings,
} from "@/lib/actions/admin/site";
import { saveCategoryHomeSettings } from "@/lib/actions/admin/categories";
import { useToast } from "@/components/admin/ui/Toast";
import { Field, Section } from "@/components/admin/ui/FormField";
import SaveBar from "@/components/admin/ui/SaveBar";
import { useUnsavedGuard } from "@/components/admin/ui/useUnsavedGuard";
import { inputCls } from "@/components/admin/ui/styles";
import type { AdminSiteSettings } from "@/lib/data/admin/site";
import type { AdminCategoryListItem } from "@/lib/data/admin/categories";
import type {
  VillaDetailPrefs,
  SimilarMode,
} from "@/lib/villaDetailPrefs";
import type { HeaderConfig, FooterConfig } from "@/lib/headerFooter";
import HeaderEditor from "./HeaderEditor";
import FooterEditor from "./FooterEditor";

interface CategoryHomeItemState {
  id: string;
  nameTr: string;
  color: string | null;
  villaCount: number;
  autoRule: string | null;
  showInBrowser: boolean;
  featuredOnHome: boolean;
  sortOrder: number;
}

/** Otomatik blok kuralının panelde gösterilen kısa Türkçe adı. */
const AUTO_RULE_LABEL: Record<string, string> = {
  popular: "puana göre",
  last_minute: "indirimli",
  cheapest: "en uygun",
  newest: "en yeni",
};

/**
 * Site ayarları. Metin alanlarının tamamı tek "Kaydet" ile gider; görseller
 * seçilir seçilmez yüklenir (ImageUploadField kendi işini yapıyor).
 *
 * Boş bırakılan her metin `null` kaydedilir ve site o alan için koddaki
 * varsayılana döner — panel hiçbir metni tutsak almasın diye.
 */
type FormState = Record<TextKey, string>;

type TextKey =
  | "heroVideoUrl"
  | "brandName"
  | "agencyName"
  | "tursabNo"
  | "phone"
  | "whatsapp"
  | "email"
  | "address"
  | "instagramUrl"
  | "facebookUrl"
  | "heroTitleTr"
  | "heroTitleEn"
  | "heroSubtitleTr"
  | "heroSubtitleEn"
  | "seoTitleTr"
  | "seoTitleEn"
  | "seoDescriptionTr"
  | "seoDescriptionEn"
  | "confirmationDepositNote"
  | "confirmationCheckinNote"
  | "adLinkUrl";

const textKeys: TextKey[] = [
  "heroVideoUrl",
  "brandName",
  "agencyName",
  "tursabNo",
  "phone",
  "whatsapp",
  "email",
  "address",
  "instagramUrl",
  "facebookUrl",
  "heroTitleTr",
  "heroTitleEn",
  "heroSubtitleTr",
  "heroSubtitleEn",
  "seoTitleTr",
  "seoTitleEn",
  "seoDescriptionTr",
  "seoDescriptionEn",
  "confirmationDepositNote",
  "confirmationCheckinNote",
  "adLinkUrl",
];

function fromSettings(s: AdminSiteSettings): FormState {
  return Object.fromEntries(
    textKeys.map((k) => [k, s[k] ?? ""])
  ) as FormState;
}

function fromCategories(cats: AdminCategoryListItem[]): CategoryHomeItemState[] {
  return [...cats]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((c, i) => ({
      id: c.id,
      nameTr: c.nameTr,
      color: c.color ?? null,
      villaCount: c.villaCount ?? 0,
      autoRule: c.autoRule ?? null,
      showInBrowser: c.showInBrowser ?? true,
      featuredOnHome: c.featuredOnHome ?? false,
      // Sıra artık listedeki konumdan üretilir; olası boşluk/çakışmaları düzelt.
      sortOrder: i,
    }));
}

const textareaCls = `${inputCls} min-h-24 resize-y`;

export default function SiteSettingsForm({
  settings,
  categories = [],
}: {
  settings: AdminSiteSettings;
  categories?: AdminCategoryListItem[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const [saved, setSaved] = useState<FormState>(() => fromSettings(settings));
  const [f, setF] = useState<FormState>(() => fromSettings(settings));
  const [savedCatList, setSavedCatList] = useState<CategoryHomeItemState[]>(() =>
    fromCategories(categories)
  );
  const [catList, setCatList] = useState<CategoryHomeItemState[]>(() =>
    fromCategories(categories)
  );
  const [savedPrefs, setSavedPrefs] = useState<VillaDetailPrefs>(
    () => settings.villaDetailPrefs
  );
  const [prefs, setPrefs] = useState<VillaDetailPrefs>(
    () => settings.villaDetailPrefs
  );
  const [savedAd, setSavedAd] = useState({
    web: settings.adShowWeb,
    mobile: settings.adShowMobile,
  });
  const [ad, setAd] = useState({
    web: settings.adShowWeb,
    mobile: settings.adShowMobile,
  });
  const [savedHeader, setSavedHeader] = useState<HeaderConfig>(
    () => settings.headerConfig
  );
  const [header, setHeader] = useState<HeaderConfig>(() => settings.headerConfig);
  const [savedFooter, setSavedFooter] = useState<FooterConfig>(
    () => settings.footerConfig
  );
  const [footer, setFooter] = useState<FooterConfig>(() => settings.footerConfig);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Filigran (watermark) state
  const [savedWatermark, setSavedWatermark] = useState({
    enabled: settings.watermarkEnabled,
    opacity: settings.watermarkOpacity,
    scale: settings.watermarkScale,
    position: settings.watermarkPosition,
  });
  const [watermark, setWatermark] = useState({
    enabled: settings.watermarkEnabled,
    opacity: settings.watermarkOpacity,
    scale: settings.watermarkScale,
    position: settings.watermarkPosition,
  });
  // Sürükle-bırak sıralama — id sürüklenen, overId üzerine gelinen satır.
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const dirty = useMemo(() => {
    const textDirty = JSON.stringify(f) !== JSON.stringify(saved);
    const catDirty =
      JSON.stringify(
        catList.map((c) => ({
          id: c.id,
          showInBrowser: c.showInBrowser,
          featuredOnHome: c.featuredOnHome,
          sortOrder: c.sortOrder,
        }))
      ) !==
      JSON.stringify(
        savedCatList.map((c) => ({
          id: c.id,
          showInBrowser: c.showInBrowser,
          featuredOnHome: c.featuredOnHome,
          sortOrder: c.sortOrder,
        }))
      );
    const prefsDirty = JSON.stringify(prefs) !== JSON.stringify(savedPrefs);
    const adDirty = JSON.stringify(ad) !== JSON.stringify(savedAd);
    const headerDirty = JSON.stringify(header) !== JSON.stringify(savedHeader);
    const footerDirty = JSON.stringify(footer) !== JSON.stringify(savedFooter);
    const watermarkDirty = JSON.stringify(watermark) !== JSON.stringify(savedWatermark);
    return (
      textDirty || catDirty || prefsDirty || adDirty || headerDirty || footerDirty || watermarkDirty
    );
  }, [
    f,
    saved,
    catList,
    savedCatList,
    prefs,
    savedPrefs,
    ad,
    savedAd,
    header,
    savedHeader,
    footer,
    savedFooter,
    watermark,
    savedWatermark,
  ]);

  useUnsavedGuard(dirty);

  const set = (k: TextKey, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const updateCategoryItem = (
    id: string,
    field: "showInBrowser" | "featuredOnHome",
    value: boolean
  ) => {
    setCatList((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  /** `id` kategorisini `targetId`'nin bulunduğu konuma taşır, sırayı yeniden numaralandırır. */
  const moveCategory = (id: string, targetId: string) => {
    if (id === targetId) return;
    setCatList((prev) => {
      const from = prev.findIndex((c) => c.id === id);
      const to = prev.findIndex((c) => c.id === targetId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next.map((c, i) => ({ ...c, sortOrder: i }));
    });
  };

  const setFact = (k: keyof VillaDetailPrefs["facts"], v: boolean) =>
    setPrefs((p) => ({ ...p, facts: { ...p.facts, [k]: v } }));
  const setSection = (k: keyof VillaDetailPrefs["sections"], v: boolean) =>
    setPrefs((p) => ({ ...p, sections: { ...p.sections, [k]: v } }));
  const setSimilar = (patch: Partial<VillaDetailPrefs["similar"]>) =>
    setPrefs((p) => ({ ...p, similar: { ...p.similar, ...patch } }));

  const submit = () => {
    setErrors({});
    start(async () => {
      const [resSite, resCat] = await Promise.all([
        saveSiteSettings({
          ...f,
          villaDetailPrefs: prefs,
          adShowWeb: ad.web,
          adShowMobile: ad.mobile,
          headerConfig: header,
          footerConfig: footer,
          watermarkEnabled: watermark.enabled,
          watermarkOpacity: watermark.opacity,
          watermarkScale: watermark.scale,
          watermarkPosition: watermark.position,
        }),
        saveCategoryHomeSettings(
          catList.map((c) => ({
            id: c.id,
            showInBrowser: c.showInBrowser,
            featuredOnHome: c.featuredOnHome,
            sortOrder: c.sortOrder,
          }))
        ),
      ]);

      if (resSite.ok && resCat.ok) {
        setSaved(f);
        setSavedCatList(catList);
        setSavedPrefs(prefs);
        setSavedAd(ad);
        setSavedHeader(header);
        setSavedFooter(footer);
        setSavedWatermark(watermark);
        toast.success("Ayarlar kaydedildi.");
        router.refresh();
        return;
      }

      if (!resSite.ok) {
        if (resSite.fields && Object.keys(resSite.fields).length > 0) {
          setErrors(resSite.fields);
          toast.error("Bazı alanlar hatalı — işaretli yerlere bakın.");
        } else {
          toast.error(
            resSite.error === "auth"
              ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
              : "Site ayarları kaydedilemedi."
          );
        }
      } else if (!resCat.ok) {
        toast.error(
          resCat.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "Kategori ayarları kaydedilemedi."
        );
      }
    });
  };

  const text = (
    k: TextKey,
    label: string,
    opts: { hint?: string; placeholder?: string; area?: boolean } = {}
  ) => (
    <Field label={label} error={errors[k]} hint={opts.hint}>
      {opts.area ? (
        <textarea
          className={textareaCls}
          value={f[k]}
          placeholder={opts.placeholder}
          onChange={(e) => set(k, e.target.value)}
        />
      ) : (
        <input
          className={inputCls}
          value={f[k]}
          placeholder={opts.placeholder}
          onChange={(e) => set(k, e.target.value)}
        />
      )}
    </Field>
  );

  const brandTab = (
    <div className="space-y-5">
      <Section title="Logo">
        <p className="mb-3 text-sm text-brand-900/70">
          Konfirmasyon çıktısının başında ve sitenin üst barında görünür. Arka
          planı saydam (PNG) veya beyaz, yatay bir logo en iyi sonucu verir.
        </p>
        <div className="max-w-xs">
          <ImageUploadField
            url={settings.logoImageUrl}
            alt="Site logosu"
            aspect="aspect-[3/1]"
            onUpload={uploadSiteLogo}
            onRemove={removeSiteLogo}
          />
        </div>
      </Section>

      <Section title="Kimlik bilgileri">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("brandName", "Marka adı", {
            placeholder: "Kaştayım Bugün Villaları",
            hint: "Konfirmasyon belgesinin başlığında kullanılır.",
          })}
          {text("agencyName", "Acente unvanı", {
            placeholder: "Kaş Likya Turizm Seyahat Acentası",
            hint: "Yasal unvan — belge ve e-posta altbilgisinde görünür.",
          })}
          {text("tursabNo", "TÜRSAB belge no", { placeholder: "17305" })}
        </div>
      </Section>
    </div>
  );

  const homeTab = (
    <div className="space-y-5">
      <Section title="Ana sayfa görseli">
        <p className="mb-3 text-sm text-brand-900/70">
          Sitenin en üstünde tam ekran gösterilir. Yatay, geniş bir fotoğraf
          seçin. Yüklenmezse öne çıkan villalardan biri kullanılır.
        </p>
        <div className="max-w-md">
          <ImageUploadField
            url={settings.heroImageUrl}
            alt="Ana sayfa hero görseli"
            aspect="aspect-[16/9]"
            onUpload={uploadSiteHero}
            onRemove={removeSiteHero}
          />
        </div>
      </Section>

      <Section title="Ana sayfa metinleri">
        <p className="mb-3 text-sm text-brand-900/70">
          Boş bırakılırsa sitedeki hazır metin kullanılır.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("heroTitleTr", "Başlık (TR)")}
          {text("heroTitleEn", "Başlık (EN)")}
          {text("heroSubtitleTr", "Alt başlık (TR)", { area: true })}
          {text("heroSubtitleEn", "Alt başlık (EN)", { area: true })}
        </div>
      </Section>

      <Section title="Ana Sayfa Kategorileri">
        <p className="mb-3 text-sm text-brand-900/70">
          Kategorilerin üst kayar şeritte ve vitrin satırlarında görünürlüğünü
          ayarlayın. Gösterim sırasını değiştirmek için satırları{" "}
          <span className="inline-flex items-center gap-0.5 font-medium text-brand-800">
            <GripVertical className="h-3.5 w-3.5" /> tutup sürükleyin
          </span>
          .
        </p>
        {catList.length === 0 ? (
          <p className="text-sm text-brand-900/70">Henüz kategori bulunmuyor.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-sand-200 bg-white">
            <div className="hidden sm:grid sm:grid-cols-12 sm:gap-4 sm:bg-sand-50 sm:px-4 sm:py-3 text-xs font-semibold text-brand-900/70 border-b border-sand-200">
              <div className="sm:col-span-5">Kategori</div>
              <div className="sm:col-span-4">Üst Kayar Şerit</div>
              <div className="sm:col-span-3">Vitrin Satırı</div>
            </div>
            <div className="divide-y divide-sand-200">
              {catList.map((cat) => {
                const isDragging = dragId === cat.id;
                const isOver = overId === cat.id && dragId !== cat.id;
                return (
                  <div
                    key={cat.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragId && dragId !== cat.id) setOverId(cat.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (dragId) moveCategory(dragId, cat.id);
                      setDragId(null);
                      setOverId(null);
                    }}
                    className={`grid gap-3 p-4 sm:grid-cols-12 sm:gap-4 sm:items-center sm:px-4 sm:py-3 text-sm transition ${
                      isDragging ? "opacity-40" : ""
                    } ${
                      isOver
                        ? "bg-brand-50 ring-2 ring-inset ring-brand-400"
                        : "bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 font-semibold text-brand-950 sm:col-span-5">
                      <button
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          setDragId(cat.id);
                          e.dataTransfer.effectAllowed = "move";
                        }}
                        onDragEnd={() => {
                          setDragId(null);
                          setOverId(null);
                        }}
                        aria-label={`${cat.nameTr} sırasını değiştir`}
                        title="Sürükleyerek sıralayın"
                        className="shrink-0 cursor-grab touch-none rounded-md p-1 text-brand-900/40 hover:bg-sand-100 hover:text-brand-700 active:cursor-grabbing"
                      >
                        <GripVertical className="h-5 w-5" />
                      </button>
                      <span
                        className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                        style={{ backgroundColor: cat.color ?? "#cbd5e1" }}
                      />
                      <span className="min-w-0 truncate">{cat.nameTr}</span>
                      {cat.autoRule ? (
                        <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
                          Otomatik · {AUTO_RULE_LABEL[cat.autoRule] ?? cat.autoRule}
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-full bg-sand-100 px-2 py-0.5 text-xs font-medium text-brand-900/60">
                          {cat.villaCount} villa
                        </span>
                      )}
                    </div>
                    <div className="sm:col-span-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cat.showInBrowser}
                          onChange={(e) =>
                            updateCategoryItem(cat.id, "showInBrowser", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs text-brand-900/80 sm:text-sm">
                          Üst Kayar Şeritte Göster
                        </span>
                      </label>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={cat.featuredOnHome}
                          onChange={(e) =>
                            updateCategoryItem(cat.id, "featuredOnHome", e.target.checked)
                          }
                          className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
                        />
                        <span className="text-xs text-brand-900/80 sm:text-sm">
                          Vitrin Satırı Olarak Göster
                        </span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Section>

      <Section title="Ana sayfa videosu (isteğe bağlı)">
        <p className="mb-3 text-sm text-brand-900/70">
          Görselin üzerinde sessiz döngüyle oynar. Kısa (8–12 sn) bir{" "}
          <code className="rounded bg-sand-100 px-1">.mp4</code> veya{" "}
          <code className="rounded bg-sand-100 px-1">.webm</code> bağlantısı
          girin. Mobilde bilerek oynatılmaz — yalnızca görsel görünür.
        </p>
        <div className="max-w-xl">
          {text("heroVideoUrl", "Video bağlantısı", {
            placeholder: "https://…/hero.mp4",
          })}
        </div>
      </Section>

      <Section title="Reklam / Kampanya Bandı">
        <p className="mb-3 text-sm text-brand-900/70">
          Ana sayfada arama çubuğunun altında görünen banner. Web ve mobil için
          ayrı görsel yükleyin; her platform ayrı açılıp kapanır. Görsel GIF ise
          hareketli gösterilir. Tıklanınca aşağıdaki bağlantıya gidilir. İlgili
          görsel yüklenmezse o platformda hiç görünmez.
        </p>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Web */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-brand-950">
                Web görseli
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={ad.web}
                  onChange={(e) =>
                    setAd((p) => ({ ...p, web: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-brand-900/80">Web&apos;de göster</span>
              </label>
            </div>
            <ImageUploadField
              url={settings.adWebImageUrl}
              alt="Reklam web görseli"
              aspect="aspect-[4/1]"
              onUpload={uploadAdWebImage}
              onRemove={removeAdWebImage}
            />
            <p className="mt-1.5 text-xs text-brand-900/55">
              Yatay geniş görsel — önerilen <strong>1920×480 px</strong> (4:1).
              PNG/JPG veya hareketli GIF.
            </p>
          </div>

          {/* Mobil */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-brand-950">
                Mobil görseli
              </span>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={ad.mobile}
                  onChange={(e) =>
                    setAd((p) => ({ ...p, mobile: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-xs text-brand-900/80">Mobilde göster</span>
              </label>
            </div>
            <ImageUploadField
              url={settings.adMobileImageUrl}
              alt="Reklam mobil görseli"
              aspect="aspect-[1320/1080]"
              onUpload={uploadAdMobileImage}
              onRemove={removeAdMobileImage}
            />
            <p className="mt-1.5 text-xs text-brand-900/55">
              Önerilen <strong>1320×1080 px</strong>. PNG/JPG veya hareketli GIF.
            </p>
          </div>
        </div>

        <div className="mt-4 max-w-xl">
          {text("adLinkUrl", "Tıklanınca gidilecek bağlantı", {
            placeholder: "/villalar",
            hint: "Boş bırakılırsa villalar sayfasına gider.",
          })}
        </div>
      </Section>
    </div>
  );

  const cbRow = (
    checked: boolean,
    onChange: (v: boolean) => void,
    label: string
  ) => (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg px-1 py-1.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
      />
      <span className="text-sm text-brand-900/85">{label}</span>
    </label>
  );

  const similarModes: [SimilarMode, string][] = [
    ["similar", "Benzer villalar (aynı bölge önce)"],
    ["category", "Bir kategoriden gelsin"],
    ["off", "Gösterme"],
  ];

  const villaDetailTab = (
    <div className="space-y-5">
      <Section title="Üst bilgi şeridi">
        <p className="mb-3 text-sm text-brand-900/70">
          Villa detay sayfasının üstündeki kutulardan hangileri görünsün. (Villada
          değer girilmemişse o kutu zaten gösterilmez.)
        </p>
        <div className="grid gap-1 sm:grid-cols-2">
          {cbRow(prefs.facts.capacity, (v) => setFact("capacity", v), "Kişi sayısı")}
          {cbRow(prefs.facts.bedrooms, (v) => setFact("bedrooms", v), "Yatak odası")}
          {cbRow(prefs.facts.bathrooms, (v) => setFact("bathrooms", v), "Banyo")}
          {cbRow(prefs.facts.size, (v) => setFact("size", v), "Alan (m²)")}
          {cbRow(
            prefs.facts.distanceToSea,
            (v) => setFact("distanceToSea", v),
            "Denize mesafe"
          )}
          {cbRow(prefs.facts.pool, (v) => setFact("pool", v), "Havuz")}
          {cbRow(prefs.facts.rating, (v) => setFact("rating", v), "Puan")}
          {cbRow(
            prefs.facts.minNights,
            (v) => setFact("minNights", v),
            "Min. konaklama"
          )}
          {cbRow(
            prefs.facts.checkInOut,
            (v) => setFact("checkInOut", v),
            "Giriş / çıkış saati"
          )}
        </div>
      </Section>

      <Section title="Bölümler">
        <p className="mb-3 text-sm text-brand-900/70">
          Sayfadaki hangi bölümler görünsün. Kapatılan bölüm başlığıyla birlikte
          gizlenir. (İçi boş olan bölüm zaten gösterilmez.)
        </p>
        <div className="grid gap-1 sm:grid-cols-2">
          {cbRow(prefs.sections.overview, (v) => setSection("overview", v), "Genel Bakış")}
          {cbRow(prefs.sections.amenities, (v) => setSection("amenities", v), "Villa Özellikleri")}
          {cbRow(prefs.sections.availability, (v) => setSection("availability", v), "Müsaitlik Takvimi")}
          {cbRow(prefs.sections.distances, (v) => setSection("distances", v), "Uzaklıklar")}
          {cbRow(prefs.sections.video, (v) => setSection("video", v), "Video")}
          {cbRow(prefs.sections.priceTable, (v) => setSection("priceTable", v), "Fiyat Tablosu")}
          {cbRow(prefs.sections.location, (v) => setSection("location", v), "Konum")}
        </div>
      </Section>

      <Section title="Benzer Villalar">
        <p className="mb-3 text-sm text-brand-900/70">
          Sayfanın en altındaki bölüm nasıl dolsun.
        </p>
        <div className="space-y-1.5">
          {similarModes.map(([mode, label]) => (
            <label key={mode} className="flex cursor-pointer items-center gap-2 px-1 py-1">
              <input
                type="radio"
                name="similarMode"
                checked={prefs.similar.mode === mode}
                onChange={() => setSimilar({ mode })}
                className="h-4 w-4 border-sand-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-brand-900/85">{label}</span>
            </label>
          ))}
        </div>
        {prefs.similar.mode === "category" && (
          <div className="mt-3 max-w-xs">
            <Field label="Kategori">
              <select
                className={inputCls}
                value={prefs.similar.categorySlug ?? ""}
                onChange={(e) =>
                  setSimilar({ categorySlug: e.target.value || null })
                }
              >
                <option value="">Kategori seçin…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.nameTr}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </Section>
    </div>
  );

  const menuFooterTab = (
    <div className="space-y-5">
      <Section title="Üst menü (Header)">
        <HeaderEditor value={header} onChange={setHeader} />
      </Section>
      <Section title="Alt bilgi (Footer)">
        <FooterEditor value={footer} onChange={setFooter} />
      </Section>
    </div>
  );

  const seoTab = (
    <div className="space-y-5">
      <Section title="Arama sonucu görünümü">
        <p className="mb-3 text-sm text-brand-900/70">
          Google&apos;da ve sosyal medyada paylaşıldığında görünen başlık ve
          açıklama. Başlığı 60, açıklamayı 155 karakter civarında tutmak
          kırpılmasını önler.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {text("seoTitleTr", "Site başlığı (TR)")}
          {text("seoTitleEn", "Site başlığı (EN)")}
          {text("seoDescriptionTr", "Açıklama (TR)", { area: true })}
          {text("seoDescriptionEn", "Açıklama (EN)", { area: true })}
        </div>
      </Section>

      <Section title="Paylaşım görseli">
        <p className="mb-3 text-sm text-brand-900/70">
          Bağlantı WhatsApp veya sosyal medyada paylaşıldığında görünen kart
          görseli. Yatay (1200×630) önerilir; yoksa ana sayfa görseli kullanılır.
        </p>
        <div className="max-w-md">
          <ImageUploadField
            url={settings.ogImageUrl}
            alt="Paylaşım kartı görseli"
            aspect="aspect-[1200/630]"
            onUpload={uploadSiteOgImage}
            onRemove={removeSiteOgImage}
          />
        </div>
      </Section>
    </div>
  );

  const contactTab = (
    <div className="space-y-5">
      <Section title="İletişim">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("phone", "Telefon", { placeholder: "+90 242 000 00 00" })}
          {text("whatsapp", "WhatsApp numarası", {
            placeholder: "+90 532 000 00 00",
            hint: "Sitedeki WhatsApp butonunun bağlantısı bu numaradan üretilir.",
          })}
          {text("email", "E-posta", { placeholder: "info@kastayimbugun.com" })}
          {text("address", "Adres", { area: true })}
        </div>
      </Section>

      <Section title="Sosyal medya">
        <div className="grid gap-4 sm:grid-cols-2">
          {text("instagramUrl", "Instagram", {
            placeholder: "https://instagram.com/…",
          })}
          {text("facebookUrl", "Facebook", {
            placeholder: "https://facebook.com/…",
          })}
        </div>
      </Section>
    </div>
  );

  const documentsTab = (
    <div className="space-y-5">
      <Section title="Konfirmasyon belgesi metinleri">
        <p className="mb-3 text-sm text-brand-900/70">
          Misafire verilen rezervasyon konfirmasyon formunun alt kısmındaki
          açıklamalar. Boş bırakılırsa belgedeki hazır metin kullanılır.
        </p>
        <div className="space-y-4">
          {text("confirmationDepositNote", "Depozito prosedürü", {
            area: true,
            hint: "Hasar depozitosunun ne zaman alınıp ne zaman iade edildiği.",
          })}
          {text("confirmationCheckinNote", "Giriş / çıkış notu", {
            area: true,
            hint: "Saatler villadan otomatik gelir; buraya ek açıklama yazın.",
          })}
        </div>
      </Section>
    </div>
  );

  /* ─── Filigran (Watermark) Tab ──────────────────────────────────────────── */
  const POSITION_LABELS: Record<string, string> = {
    center: "Ortada",
    "bottom-right": "Sağ alt",
    "bottom-left": "Sol alt",
    "top-right": "Sağ üst",
    "top-left": "Sol üst",
  };

  // Önizleme: logo SVG'sini pozisyon ve opaklığa göre yerleştirir
  const previewPositionStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { position: "absolute", pointerEvents: "none" };
    const pct = Math.round(watermark.scale * 100);
    const logoStyle: React.CSSProperties = { width: `${pct}%`, opacity: watermark.opacity };
    switch (watermark.position) {
      case "bottom-right": return { ...base, bottom: "6%", right: "4%", ...logoStyle };
      case "bottom-left":  return { ...base, bottom: "6%", left: "4%",  ...logoStyle };
      case "top-right":    return { ...base, top: "6%",    right: "4%", ...logoStyle };
      case "top-left":     return { ...base, top: "6%",    left: "4%",  ...logoStyle };
      default:             return { ...base, top: "50%", left: "50%", transform: "translate(-50%,-50%)", ...logoStyle };
    }
  };

  const watermarkTab = (
    <div className="space-y-6">
      <Section title="Filigran Ayarları">
        <p className="mb-4 text-sm text-brand-900/70">
          Siteden sunucuya aktarılan tüm villa fotoğraflarına logonuz otomatik olarak
          şeffaf biçimde eklenir. Bu ayarlar yeni yüklemeler için geçerlidir;
          mevcut görselleri güncellemek için toplu aktarımı yeniden çalıştırın.
        </p>

        {/* Etkinleştir/devre dışı */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            role="switch"
            aria-checked={watermark.enabled}
            onClick={() => setWatermark((w) => ({ ...w, enabled: !w.enabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              watermark.enabled ? "bg-brand-600" : "bg-sand-300"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                watermark.enabled ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
          <span className="text-sm font-medium text-brand-900">
            {watermark.enabled ? "Filigran aktif" : "Filigran kapalı"}
          </span>
        </div>

        <div className={`space-y-5 transition-opacity ${watermark.enabled ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          {/* Şeffaflık */}
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-2">
              Şeffaflık
              <span className="ml-2 text-xs text-brand-900/50 font-normal">
                {Math.round(watermark.opacity * 100)}%
              </span>
            </label>
            <div className="flex items-center gap-3">
              <Droplets className="h-4 w-4 text-brand-400 shrink-0" />
              <input
                type="range"
                min={5} max={80} step={5}
                value={Math.round(watermark.opacity * 100)}
                onChange={(e) => setWatermark((w) => ({ ...w, opacity: Number(e.target.value) / 100 }))}
                className="w-full h-2 appearance-none rounded-full bg-sand-200 accent-brand-600 cursor-pointer"
              />
              <span className="w-10 text-right text-sm text-brand-900/60">{Math.round(watermark.opacity * 100)}%</span>
            </div>
            <div className="flex justify-between text-xs text-brand-900/40 mt-1">
              <span>Çok şeffaf</span><span>Belirgin</span>
            </div>
          </div>

          {/* Boyut */}
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-2">
              Logo boyutu
              <span className="ml-2 text-xs text-brand-900/50 font-normal">
                Fotoğraf genişliğinin %{Math.round(watermark.scale * 100)}&apos;i
              </span>
            </label>
            <div className="flex items-center gap-3">
              <ImageIcon className="h-4 w-4 text-brand-400 shrink-0" />
              <input
                type="range"
                min={15} max={80} step={5}
                value={Math.round(watermark.scale * 100)}
                onChange={(e) => setWatermark((w) => ({ ...w, scale: Number(e.target.value) / 100 }))}
                className="w-full h-2 appearance-none rounded-full bg-sand-200 accent-brand-600 cursor-pointer"
              />
              <span className="w-10 text-right text-sm text-brand-900/60">%{Math.round(watermark.scale * 100)}</span>
            </div>
            <div className="flex justify-between text-xs text-brand-900/40 mt-1">
              <span>Küçük</span><span>Büyük</span>
            </div>
          </div>

          {/* Konum */}
          <div>
            <label className="block text-sm font-medium text-brand-900 mb-2">Konum</label>
            <div className="grid grid-cols-3 gap-2">
              {(["top-left","top-right","center","bottom-left","bottom-right"] as const).map((pos) => {
                // Grid sıralaması: TL, TR, center (orta satır), BL, BR
                const order = {"top-left":1,"top-right":2,"center":3,"bottom-left":4,"bottom-right":5}[pos];
                return (
                  <button
                    key={pos}
                    type="button"
                    style={{ order }}
                    onClick={() => setWatermark((w) => ({ ...w, position: pos }))}
                    className={`rounded-lg border-2 py-2 px-3 text-xs font-medium transition-all ${
                      watermark.position === pos
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-sand-200 bg-white text-brand-900/60 hover:border-brand-300"
                    } ${
                      pos === "center" ? "col-start-2" : ""
                    }`}
                  >
                    {POSITION_LABELS[pos]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Section>

      {/* Canlı Önizleme */}
      <Section title="Canlı Önizleme">
        <p className="mb-3 text-sm text-brand-900/70">
          Logonuzun fotoğraf üzerinde nasıl görüneceğini gerçek zamanlı olarak görün.
        </p>
        <div
          className="relative w-full overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800"
          style={{ aspectRatio: "16/9" }}
        >
          {/* Örnek villa fotoğrafı arka plan */}
          <div className="absolute inset-0 bg-[url('/images/preview-bg.jpg')] bg-cover bg-center opacity-70" />
          {/* Degrade overlay (gerçek fotoğraf gibi görünsün) */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10" />
          {/* Filigran — önizleme */}
          {watermark.enabled && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/logo.svg"
              alt="Logo önizleme"
              style={previewPositionStyle()}
              className="select-none"
            />
          )}
          {/* Bilgi etiketi */}
          <div className="absolute bottom-2 left-2 text-[10px] text-white/60 bg-black/30 px-2 py-0.5 rounded">
            Önizleme — gerçek fotoğraf benzer görünür
          </div>
        </div>

        {!watermark.enabled && (
          <p className="mt-2 text-sm text-amber-600 font-medium">
            ⚠️ Filigran kapalı — fotoğraflar logosuz yüklenecek.
          </p>
        )}
      </Section>
    </div>
  );

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Tabs
        paramKey="sekme"
        tabs={[
          { id: "brand", label: "Marka", content: brandTab },
          { id: "home", label: "Ana sayfa", content: homeTab },
          { id: "villa", label: "Villa Detay", content: villaDetailTab },
          { id: "menufooter", label: "Menü & Footer", content: menuFooterTab },
          { id: "seo", label: "SEO", content: seoTab },
          { id: "contact", label: "İletişim", content: contactTab },
          { id: "documents", label: "Belgeler", content: documentsTab },
          { id: "watermark", label: "🖼 Filigran", content: watermarkTab },
        ]}
      />

      <SaveBar pending={pending} dirty={dirty} label="Kaydet" />
    </form>
  );
}
