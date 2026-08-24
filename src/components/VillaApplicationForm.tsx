"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  MapPin,
  ListChecks,
  ImagePlus,
  FileText,
  Send,
  Loader2,
  X,
  Phone,
  User,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { createVillaApplication } from "@/lib/actions/villaApplication";
import type { ApplicationQuestion } from "@/lib/data/applicationQuestions";

/** İstemci tarafı fotoğraf sıkıştırma: uzun kenar 1600px, JPEG ~0.8.
 *  Telefon fotoğrafları (5–10 MB) böylece ~200–400 KB'a iner; tek istekte
 *  çoklu yükleme sunucu gövde sınırını (9 MB) aşmaz. Sunucu ayrıca
 *  processImage ile WebP'ye çevirip artık metadata'yı temizler. */
async function compressImage(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.8)
    );
    return blob ?? file;
  } catch {
    return file; // tarayıcı desteklemiyorsa orijinali gönder (sunucu yine işler)
  }
}

interface Photo {
  id: string;
  blob: Blob;
  url: string;
}

const MAX_PHOTOS = 15;

export default function VillaApplicationForm({
  questions,
}: {
  questions: ApplicationQuestion[];
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [core, setCore] = useState({
    ownerName: "",
    phone: "",
    email: "",
    villaName: "",
    location: "",
    address: "",
    description: "",
  });
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const label = (q: ApplicationQuestion) =>
    lang === "tr" ? q.labelTr : q.labelEn;
  const help = (q: ApplicationQuestion) =>
    lang === "tr" ? q.helpTr : q.helpEn;

  const setCoreField = (k: keyof typeof core, v: string) =>
    setCore((c) => ({ ...c, [k]: v }));
  const setAnswer = (qkey: string, v: string) =>
    setAnswers((a) => ({ ...a, [qkey]: v }));

  const onPickFiles = async (list: FileList | null) => {
    if (!list) return;
    const room = MAX_PHOTOS - photos.length;
    const chosen = Array.from(list).slice(0, Math.max(0, room));
    const next: Photo[] = [];
    for (const file of chosen) {
      const blob = await compressImage(file);
      next.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        blob,
        url: URL.createObjectURL(blob),
      });
    }
    setPhotos((p) => [...p, ...next]);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removePhoto = (id: string) =>
    setPhotos((p) => {
      const found = p.find((x) => x.id === id);
      if (found) URL.revokeObjectURL(found.url);
      return p.filter((x) => x.id !== id);
    });

  const submit = () => {
    setError(null);

    // İstemci doğrulaması (yalnızca UX — asıl kontrol sunucuda).
    if (
      core.ownerName.trim().length < 2 ||
      core.phone.trim().length < 7 ||
      core.villaName.trim().length < 2 ||
      core.location.trim().length < 2
    ) {
      setError(t("apply.errValidation"));
      return;
    }
    for (const q of questions) {
      if (q.required && q.type !== "boolean" && !answers[q.qkey]?.trim()) {
        setError(t("apply.errQuestions"));
        return;
      }
    }
    if (photos.length === 0) {
      setError(t("apply.errPhotos"));
      return;
    }

    const fd = new FormData();
    fd.set("ownerName", core.ownerName);
    fd.set("phone", core.phone);
    fd.set("email", core.email);
    fd.set("villaName", core.villaName);
    fd.set("location", core.location);
    fd.set("address", core.address);
    fd.set("description", core.description);
    fd.set("lang", lang);
    for (const q of questions) {
      fd.set(`answer_${q.qkey}`, answers[q.qkey] ?? "");
    }
    photos.forEach((p, i) => fd.append("photos", p.blob, `photo-${i}.jpg`));

    startTransition(async () => {
      const res = await createVillaApplication(fd);
      if (res.ok) {
        router.push("/villa-basvurusu/tesekkurler");
      } else {
        setError(
          res.error === "photos"
            ? t("apply.errPhotos")
            : res.error === "questions"
              ? t("apply.errQuestions")
              : res.error === "captcha"
                ? t("apply.errCaptcha")
                : res.error === "validation"
                  ? t("apply.errValidation")
                  : t("apply.errGeneric")
        );
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
      {/* Başlık */}
      <div className="text-center">
        <h1 className="text-2xl font-extrabold text-brand-950 sm:text-3xl">
          {t("apply.pageTitle")}
        </h1>
        <p className="mx-auto mt-3 max-w-xl leading-relaxed text-brand-900/60">
          {t("apply.pageSubtitle")}
        </p>
      </div>

      <div className="mt-8 space-y-5">
        {/* İletişim */}
        <FormSection icon={User} title={t("apply.secContact")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t("apply.ownerName")}
              required
              value={core.ownerName}
              onChange={(v) => setCoreField("ownerName", v)}
              placeholder={t("apply.ownerNamePh")}
            />
            <TextField
              label={t("apply.phone")}
              required
              type="tel"
              value={core.phone}
              onChange={(v) => setCoreField("phone", v)}
              placeholder={t("apply.phonePh")}
              icon={Phone}
            />
          </div>
          <TextField
            label={`${t("apply.email")} · ${t("apply.optional")}`}
            type="email"
            value={core.email}
            onChange={(v) => setCoreField("email", v)}
            placeholder={t("apply.emailPh")}
            className="mt-4"
          />
        </FormSection>

        {/* Villa & Konum */}
        <FormSection icon={MapPin} title={t("apply.secVilla")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={t("apply.villaName")}
              required
              value={core.villaName}
              onChange={(v) => setCoreField("villaName", v)}
              placeholder={t("apply.villaNamePh")}
              icon={Home}
            />
            <TextField
              label={t("apply.location")}
              required
              value={core.location}
              onChange={(v) => setCoreField("location", v)}
              placeholder={t("apply.locationPh")}
              icon={MapPin}
            />
          </div>
          <TextField
            label={`${t("apply.address")} · ${t("apply.optional")}`}
            value={core.address}
            onChange={(v) => setCoreField("address", v)}
            placeholder={t("apply.addressPh")}
            className="mt-4"
          />
        </FormSection>

        {/* Villa özellikleri — panelden yönetilen dinamik sorular */}
        {questions.length > 0 && (
          <FormSection icon={ListChecks} title={t("apply.secFeatures")}>
            <div className="grid gap-4 sm:grid-cols-2">
              {questions.map((q) => (
                <div
                  key={q.id}
                  className={q.type === "textarea" ? "sm:col-span-2" : ""}
                >
                  <QuestionInput
                    q={q}
                    label={label(q)}
                    help={help(q)}
                    lang={lang}
                    value={answers[q.qkey] ?? ""}
                    onChange={(v) => setAnswer(q.qkey, v)}
                    selectPlaceholder={t("apply.selectPh")}
                  />
                </div>
              ))}
            </div>
          </FormSection>
        )}

        {/* Fotoğraflar */}
        <FormSection icon={ImagePlus} title={t("apply.secPhotos")}>
          <p className="text-sm text-brand-900/60">{t("apply.photosHint")}</p>

          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {photos.map((p) => (
              <div
                key={p.id}
                className="group relative aspect-square overflow-hidden rounded-xl border border-sand-200 bg-sand-50"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(p.id)}
                  aria-label={t("apply.removePhoto")}
                  className="absolute right-1.5 top-1.5 rounded-full bg-brand-950/60 p-1 text-white opacity-0 transition group-hover:opacity-100 focus:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            {photos.length < MAX_PHOTOS && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-sand-300 bg-white text-brand-900/50 transition hover:border-brand-400 hover:text-brand-600"
              >
                <ImagePlus className="h-6 w-6" />
                <span className="text-xs font-semibold">
                  {t("apply.addPhotos")}
                </span>
              </button>
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void onPickFiles(e.target.files)}
          />
          <p className="mt-2 text-xs text-brand-900/45">
            {photos.length}/{MAX_PHOTOS}
          </p>
        </FormSection>

        {/* Açıklama */}
        <FormSection icon={FileText} title={t("apply.secDesc")}>
          <textarea
            value={core.description}
            onChange={(e) => setCoreField("description", e.target.value)}
            placeholder={t("apply.descriptionPh")}
            rows={4}
            className="w-full resize-y rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </FormSection>

        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">
            {error}
          </p>
        )}

        <p className="text-center text-xs text-brand-900/45">
          {t("apply.consent")}
        </p>

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sun-500 py-3.5 font-bold text-white shadow-sm transition hover:bg-sun-600 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-brand-900/40"
        >
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          {pending ? t("apply.submitting") : t("apply.submit")}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- parçalar */

function FormSection({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-base font-bold text-brand-950">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  icon: Icon,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1.5 block text-sm font-semibold text-brand-950">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-900/40" />
        )}
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border border-sand-200 bg-white py-2.5 text-sm outline-none transition placeholder:text-brand-900/40 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
            Icon ? "pl-9 pr-3.5" : "px-3.5"
          }`}
        />
      </div>
    </label>
  );
}

function QuestionInput({
  q,
  label,
  help,
  lang,
  value,
  onChange,
  selectPlaceholder,
}: {
  q: ApplicationQuestion;
  label: string;
  help: string | null;
  lang: "tr" | "en";
  value: string;
  onChange: (v: string) => void;
  selectPlaceholder: string;
}) {
  const inputCls =
    "w-full rounded-xl border border-sand-200 bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-brand-900/40 focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  if (q.type === "boolean") {
    const checked = value === "true";
    return (
      <label className="flex h-full cursor-pointer items-center gap-3 rounded-xl border border-sand-200 bg-white px-3.5 py-3 transition hover:border-brand-300">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "true" : "")}
          className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-300"
        />
        <span className="text-sm font-semibold text-brand-950">{label}</span>
      </label>
    );
  }

  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-brand-950">
        {label}
        {q.required && <span className="text-rose-500"> *</span>}
      </span>

      {q.type === "select" ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        >
          <option value="">{selectPlaceholder}</option>
          {q.options.map((o) => (
            <option key={o.value} value={o.value}>
              {lang === "tr" ? o.labelTr : o.labelEn}
            </option>
          ))}
        </select>
      ) : q.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={`${inputCls} resize-y`}
        />
      ) : (
        <input
          type={q.type === "number" ? "number" : "text"}
          min={q.type === "number" ? 0 : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputCls}
        />
      )}

      {help && (
        <span className="mt-1 block text-xs text-brand-900/50">{help}</span>
      )}
    </label>
  );
}
