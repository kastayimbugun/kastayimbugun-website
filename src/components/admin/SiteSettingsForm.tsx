"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import ImageUploadField from "@/components/admin/ImageUploadField";
import Tabs from "@/components/admin/Tabs";
import {
  uploadSiteHero,
  removeSiteHero,
  uploadSiteLogo,
  removeSiteLogo,
  uploadSiteOgImage,
  removeSiteOgImage,
  saveSiteSettings,
} from "@/lib/actions/admin/site";
import { useToast } from "@/components/admin/ui/Toast";
import { Field, Section } from "@/components/admin/ui/FormField";
import SaveBar from "@/components/admin/ui/SaveBar";
import { useUnsavedGuard } from "@/components/admin/ui/useUnsavedGuard";
import { inputCls } from "@/components/admin/ui/styles";
import type { AdminSiteSettings } from "@/lib/data/admin/site";

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
  | "confirmationCheckinNote";

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
];

function fromSettings(s: AdminSiteSettings): FormState {
  return Object.fromEntries(
    textKeys.map((k) => [k, s[k] ?? ""])
  ) as FormState;
}

const textareaCls = `${inputCls} min-h-24 resize-y`;

export default function SiteSettingsForm({
  settings,
}: {
  settings: AdminSiteSettings;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();

  const [saved, setSaved] = useState<FormState>(() => fromSettings(settings));
  const [f, setF] = useState<FormState>(() => fromSettings(settings));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = useMemo(
    () => JSON.stringify(f) !== JSON.stringify(saved),
    [f, saved]
  );
  useUnsavedGuard(dirty);

  const set = (k: TextKey, v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const submit = () => {
    setErrors({});
    start(async () => {
      const res = await saveSiteSettings(f);
      if (res.ok) {
        setSaved(f);
        toast.success("Ayarlar kaydedildi.");
        router.refresh();
        return;
      }

      if (res.fields && Object.keys(res.fields).length > 0) {
        setErrors(res.fields);
        toast.error("Bazı alanlar hatalı — işaretli yerlere bakın.");
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "Kaydedilemedi."
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

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Tabs
        tabs={[
          { id: "brand", label: "Marka", content: brandTab },
          { id: "home", label: "Ana sayfa", content: homeTab },
          { id: "seo", label: "SEO", content: seoTab },
          { id: "contact", label: "İletişim", content: contactTab },
          { id: "documents", label: "Belgeler", content: documentsTab },
        ]}
      />

      <SaveBar pending={pending} dirty={dirty} label="Kaydet" />
    </form>
  );
}
