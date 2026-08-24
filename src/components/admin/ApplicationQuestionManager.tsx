"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronUp,
  ChevronDown,
  Loader2,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import {
  createQuestion,
  updateQuestion,
  reorderQuestion,
  toggleQuestionActive,
  deleteQuestion,
} from "@/lib/actions/admin/applications";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { Field } from "@/components/admin/ui/FormField";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { EmptyState } from "@/components/admin/ui/PageHeader";
import { ListChecks } from "lucide-react";
import {
  inputCls,
  btnPrimary,
  btnSecondary,
  btnIcon,
  btnIconDanger,
} from "@/components/admin/ui/styles";
import {
  questionTypeLabel,
  type QuestionType,
} from "@/lib/schemas/villaApplication";
import type { ApplicationQuestion } from "@/lib/data/applicationQuestions";

interface OptionDraft {
  value: string;
  labelTr: string;
  labelEn: string;
}

interface Draft {
  id: string | null; // null → yeni
  qkey: string;
  labelTr: string;
  labelEn: string;
  helpTr: string;
  helpEn: string;
  type: QuestionType;
  options: OptionDraft[];
  required: boolean;
  active: boolean;
}

function emptyDraft(): Draft {
  return {
    id: null,
    qkey: "",
    labelTr: "",
    labelEn: "",
    helpTr: "",
    helpEn: "",
    type: "text",
    options: [],
    required: false,
    active: true,
  };
}

function toDraft(q: ApplicationQuestion): Draft {
  return {
    id: q.id,
    qkey: q.qkey,
    labelTr: q.labelTr,
    labelEn: q.labelEn,
    helpTr: q.helpTr ?? "",
    helpEn: q.helpEn ?? "",
    type: q.type,
    options: q.options.map((o) => ({ ...o })),
    required: q.required,
    active: q.active,
  };
}

export default function ApplicationQuestionManager({
  questions,
}: {
  questions: ApplicationQuestion[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSave] = useTransition();
  const [rowPending, startRow] = useTransition();

  const openNew = () => {
    setErrors({});
    setDraft(emptyDraft());
  };
  const openEdit = (q: ApplicationQuestion) => {
    setErrors({});
    setDraft(toDraft(q));
  };
  const close = () => setDraft(null);

  const save = () => {
    if (!draft) return;
    setErrors({});
    const payload = {
      qkey: draft.qkey,
      labelTr: draft.labelTr,
      labelEn: draft.labelEn,
      helpTr: draft.helpTr,
      helpEn: draft.helpEn,
      type: draft.type,
      options: draft.type === "select" ? draft.options : [],
      required: draft.required,
      active: draft.active,
    };

    startSave(async () => {
      const res = draft.id
        ? await updateQuestion({ ...payload, id: draft.id })
        : await createQuestion(payload);
      if (res.ok) {
        toast.success(draft.id ? "Soru güncellendi." : "Soru eklendi.");
        setDraft(null);
        router.refresh();
      } else if (res.fields && Object.keys(res.fields).length > 0) {
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

  const move = (id: string, direction: "up" | "down") => {
    startRow(async () => {
      const res = await reorderQuestion({ id, direction });
      if (res.ok) router.refresh();
      else toast.error("Sıralanamadı.");
    });
  };

  const toggle = (q: ApplicationQuestion) => {
    startRow(async () => {
      const res = await toggleQuestionActive({ id: q.id, active: !q.active });
      if (res.ok) {
        toast.success(q.active ? "Soru pasifleştirildi." : "Soru aktifleştirildi.");
        router.refresh();
      } else toast.error("İşlem başarısız.");
    });
  };

  const remove = async (q: ApplicationQuestion) => {
    const ok = await confirm({
      title: "Soru silinsin mi?",
      body: (
        <p className="text-sm text-brand-900/80">
          <strong className="text-brand-950">{q.labelTr}</strong> sorusu formdan
          kaldırılacak. Geçmiş başvurulardaki cevaplar veride korunur.
        </p>
      ),
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!ok) return;
    startRow(async () => {
      const res = await deleteQuestion({ id: q.id });
      if (res.ok) {
        toast.success("Soru silindi.");
        router.refresh();
      } else toast.error("Silinemedi.");
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={openNew} className={btnPrimary}>
          <Plus className="h-4 w-4" />
          Yeni soru
        </button>
      </div>

      {questions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Henüz soru yok"
          description="Villa özelliklerini toplamak için forma soru ekleyin (kaç oda, havuz var mı…)."
        />
      ) : (
        <ul className="divide-y divide-sand-100 overflow-hidden rounded-2xl border border-sand-200 bg-white">
          {questions.map((q, i) => (
            <li
              key={q.id}
              className="flex items-center gap-3 px-4 py-3 sm:px-5"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  aria-label="Yukarı taşı"
                  disabled={i === 0 || rowPending}
                  onClick={() => move(q.id, "up")}
                  className={btnIcon}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Aşağı taşı"
                  disabled={i === questions.length - 1 || rowPending}
                  onClick={() => move(q.id, "down")}
                  className={btnIcon}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-brand-950">
                    {q.labelTr}
                  </span>
                  {q.required && (
                    <StatusBadge tone="warning">Zorunlu</StatusBadge>
                  )}
                  {!q.active && <StatusBadge tone="neutral">Pasif</StatusBadge>}
                </div>
                <div className="mt-0.5 text-xs text-brand-900/60">
                  <code className="rounded bg-sand-100 px-1 py-0.5">{q.qkey}</code>{" "}
                  · {questionTypeLabel[q.type]}
                  {q.type === "select" && ` · ${q.options.length} seçenek`}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  aria-label={q.active ? "Pasifleştir" : "Aktifleştir"}
                  title={q.active ? "Pasifleştir" : "Aktifleştir"}
                  onClick={() => toggle(q)}
                  disabled={rowPending}
                  className={btnIcon}
                >
                  {q.active ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  aria-label="Düzenle"
                  onClick={() => openEdit(q)}
                  className={btnIcon}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="Sil"
                  onClick={() => remove(q)}
                  disabled={rowPending}
                  className={btnIconDanger}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <QuestionEditor
          draft={draft}
          setDraft={setDraft}
          errors={errors}
          saving={saving}
          onSave={save}
          onClose={close}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------- düzenleme modalı */

function QuestionEditor({
  draft,
  setDraft,
  errors,
  saving,
  onSave,
  onClose,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  errors: Record<string, string>;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft({ ...draft, [k]: v });

  const setOption = (i: number, patch: Partial<OptionDraft>) => {
    const options = draft.options.map((o, idx) =>
      idx === i ? { ...o, ...patch } : o
    );
    setDraft({ ...draft, options });
  };
  const addOption = () =>
    setDraft({
      ...draft,
      options: [...draft.options, { value: "", labelTr: "", labelEn: "" }],
    });
  const removeOption = (i: number) =>
    setDraft({ ...draft, options: draft.options.filter((_, idx) => idx !== i) });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-bold text-brand-950">
            {draft.id ? "Soruyu düzenle" : "Yeni soru"}
          </h2>
          <button
            type="button"
            aria-label="Kapat"
            onClick={onClose}
            className={btnIcon}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Etiket (TR)" required error={errors.labelTr}>
              <input
                className={inputCls}
                value={draft.labelTr}
                onChange={(e) => set("labelTr", e.target.value)}
                placeholder="Örn. Kaç kişilik?"
              />
            </Field>
            <Field label="Etiket (EN)" required error={errors.labelEn}>
              <input
                className={inputCls}
                value={draft.labelEn}
                onChange={(e) => set("labelEn", e.target.value)}
                placeholder="e.g. Sleeps how many?"
              />
            </Field>
          </div>

          <Field
            label="Anahtar (qkey)"
            required
            error={errors.qkey}
            hint={
              draft.id
                ? "Anahtar oluşturulduktan sonra değiştirilemez."
                : "Küçük harf, rakam, alt çizgi. Ör. bedrooms"
            }
          >
            <input
              className={inputCls}
              value={draft.qkey}
              disabled={Boolean(draft.id)}
              onChange={(e) =>
                set(
                  "qkey",
                  e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_")
                )
              }
              placeholder="bedrooms"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tip" required>
              <select
                className={inputCls}
                value={draft.type}
                onChange={(e) => set("type", e.target.value as QuestionType)}
              >
                {(
                  Object.keys(questionTypeLabel) as QuestionType[]
                ).map((t) => (
                  <option key={t} value={t}>
                    {questionTypeLabel[t]}
                  </option>
                ))}
              </select>
            </Field>
            <div className="flex items-end gap-4 pb-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-950">
                <input
                  type="checkbox"
                  checked={draft.required}
                  onChange={(e) => set("required", e.target.checked)}
                  className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-300"
                />
                Zorunlu
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-brand-950">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) => set("active", e.target.checked)}
                  className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-300"
                />
                Aktif
              </label>
            </div>
          </div>

          {/* Seçenekler — yalnızca select tipinde */}
          {draft.type === "select" && (
            <div className="rounded-xl border border-sand-200 bg-sand-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wide text-brand-900/70">
                  Seçenekler
                </span>
                <button
                  type="button"
                  onClick={addOption}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Seçenek ekle
                </button>
              </div>
              {errors.options && (
                <p className="mb-2 text-[11px] font-semibold text-rose-700">
                  {errors.options}
                </p>
              )}
              <div className="space-y-2">
                {draft.options.map((o, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      className={`${inputCls} flex-1`}
                      value={o.value}
                      onChange={(e) =>
                        setOption(i, {
                          value: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9_-]/g, "-"),
                        })
                      }
                      placeholder="değer"
                    />
                    <input
                      className={`${inputCls} flex-1`}
                      value={o.labelTr}
                      onChange={(e) => setOption(i, { labelTr: e.target.value })}
                      placeholder="Etiket TR"
                    />
                    <input
                      className={`${inputCls} flex-1`}
                      value={o.labelEn}
                      onChange={(e) => setOption(i, { labelEn: e.target.value })}
                      placeholder="Label EN"
                    />
                    <button
                      type="button"
                      aria-label="Seçeneği kaldır"
                      onClick={() => removeOption(i)}
                      className={btnIconDanger}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {draft.options.length === 0 && (
                  <p className="text-xs text-brand-900/50">
                    En az bir seçenek ekleyin.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Yardım metni (TR)" hint="Opsiyonel" error={errors.helpTr}>
              <input
                className={inputCls}
                value={draft.helpTr}
                onChange={(e) => set("helpTr", e.target.value)}
              />
            </Field>
            <Field label="Yardım metni (EN)" hint="Opsiyonel" error={errors.helpEn}>
              <input
                className={inputCls}
                value={draft.helpEn}
                onChange={(e) => set("helpEn", e.target.value)}
              />
            </Field>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Vazgeç
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            className={btnPrimary}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
