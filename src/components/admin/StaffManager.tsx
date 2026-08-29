"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  UserPlus,
  Pencil,
  Trash2,
  KeyRound,
  Loader2,
  X,
  ShieldCheck,
} from "lucide-react";
import {
  createStaffUser,
  updateStaffMember,
  resetStaffPassword,
  deleteStaffMember,
  type StaffActionResult,
} from "@/lib/actions/admin/staff";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { Field } from "@/components/admin/ui/FormField";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { EmptyState } from "@/components/admin/ui/PageHeader";
import { Users } from "lucide-react";
import {
  inputCls,
  btnPrimary,
  btnSecondary,
  btnIcon,
  btnIconDanger,
} from "@/components/admin/ui/styles";
import {
  MODULE_KEYS,
  MODULE_LABELS,
  PRESETS,
  type ModuleKey,
} from "@/lib/auth/permissions";
import type { StaffMember } from "@/lib/data/admin/staff";

type Role = "admin" | "editor";

interface Draft {
  id: string | null; // null → yeni
  email: string;
  fullName: string;
  password: string;
  role: Role;
  permissions: ModuleKey[];
}

function draftFor(member: StaffMember | null): Draft {
  if (!member) {
    return {
      id: null,
      email: "",
      fullName: "",
      password: "",
      role: "editor",
      permissions: [],
    };
  }
  return {
    id: member.id,
    email: member.email ?? "",
    fullName: member.fullName ?? "",
    password: "",
    role: member.role,
    permissions: member.permissions.filter((p): p is ModuleKey =>
      (MODULE_KEYS as readonly string[]).includes(p)
    ),
  };
}

function errorMessage(res: Extract<StaffActionResult, { ok: false }>): string {
  switch (res.error) {
    case "auth":
      return "Bu işlem için admin yetkisi gerekli.";
    case "self":
      return "Kendi hesabınız üzerinde bu işlemi yapamazsınız.";
    case "lastAdmin":
      return "Son admin düşürülemez veya silinemez.";
    default:
      return "İşlem başarısız.";
  }
}

export default function StaffManager({
  staff,
  meId,
}: {
  staff: StaffMember[];
  meId: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [resetFor, setResetFor] = useState<StaffMember | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSave] = useTransition();
  const [rowPending, startRow] = useTransition();

  const openCreate = () => {
    setErrors({});
    setDraft(draftFor(null));
  };
  const openEdit = (m: StaffMember) => {
    setErrors({});
    setDraft(draftFor(m));
  };

  const save = () => {
    if (!draft) return;
    setErrors({});
    startSave(async () => {
      const res = draft.id
        ? await updateStaffMember({
            id: draft.id,
            fullName: draft.fullName,
            role: draft.role,
            permissions: draft.role === "admin" ? [] : draft.permissions,
          })
        : await createStaffUser({
            email: draft.email,
            password: draft.password,
            fullName: draft.fullName,
            role: draft.role,
            permissions: draft.role === "admin" ? [] : draft.permissions,
          });
      if (res.ok) {
        toast.success(draft.id ? "Personel güncellendi." : "Personel eklendi.");
        setDraft(null);
        router.refresh();
      } else if (res.fields && Object.keys(res.fields).length > 0) {
        setErrors(res.fields);
        toast.error("Bazı alanlar hatalı — işaretli yerlere bakın.");
      } else {
        toast.error(errorMessage(res));
      }
    });
  };

  const doDelete = async (m: StaffMember) => {
    const ok = await confirm({
      title: "Personel silinsin mi?",
      body: (
        <p className="text-sm text-brand-900/80">
          <strong className="text-brand-950">
            {m.fullName ?? m.email}
          </strong>{" "}
          hesabı ve panel erişimi kalıcı olarak silinecek. Bu işlem geri alınamaz.
        </p>
      ),
      confirmLabel: "Evet, sil",
      cancelLabel: "Vazgeç",
      tone: "danger",
    });
    if (!ok) return;
    startRow(async () => {
      const res = await deleteStaffMember({ id: m.id });
      if (res.ok) {
        toast.success("Personel silindi.");
        router.refresh();
      } else {
        toast.error(errorMessage(res));
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" onClick={openCreate} className={btnPrimary}>
          <UserPlus className="h-4 w-4" />
          Yeni personel
        </button>
      </div>

      {staff.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Personel yok"
          description="Panele erişecek kişileri buradan ekleyin ve yetkilerini belirleyin."
        />
      ) : (
        <ul className="divide-y divide-sand-100 overflow-hidden rounded-2xl border border-sand-200 bg-white">
          {staff.map((m) => {
            const isMe = m.id === meId;
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-3 px-4 py-4 sm:px-5"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-brand-950">
                      {m.fullName ?? "—"}
                    </span>
                    {m.role === "admin" ? (
                      <StatusBadge tone="success">Admin</StatusBadge>
                    ) : (
                      <StatusBadge tone="info">Editör</StatusBadge>
                    )}
                    {isMe && <StatusBadge tone="neutral">Siz</StatusBadge>}
                  </div>
                  <div className="mt-0.5 text-sm text-brand-900/70">
                    {m.email}
                  </div>
                  {m.role !== "admin" && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {m.permissions.length === 0 ? (
                        <span className="text-xs text-brand-900/45">
                          Yetki atanmamış
                        </span>
                      ) : (
                        (m.permissions as ModuleKey[])
                          .filter((p) =>
                            (MODULE_KEYS as readonly string[]).includes(p)
                          )
                          .map((p) => (
                            <span
                              key={p}
                              className="rounded-full bg-sand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-800"
                            >
                              {MODULE_LABELS[p]}
                            </span>
                          ))
                      )}
                    </div>
                  )}
                  {m.role === "admin" && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-emerald-700">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      Tüm modüllere erişim
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label="Şifre sıfırla"
                    title="Şifre sıfırla"
                    onClick={() => {
                      setErrors({});
                      setResetFor(m);
                    }}
                    className={btnIcon}
                  >
                    <KeyRound className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Düzenle"
                    title="Düzenle"
                    onClick={() => openEdit(m)}
                    className={btnIcon}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Sil"
                    title={isMe ? "Kendinizi silemezsiniz" : "Sil"}
                    onClick={() => doDelete(m)}
                    disabled={isMe || rowPending}
                    className={btnIconDanger}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {draft && (
        <StaffEditor
          draft={draft}
          setDraft={setDraft}
          errors={errors}
          saving={saving}
          isSelf={draft.id === meId}
          onSave={save}
          onClose={() => setDraft(null)}
        />
      )}

      {resetFor && (
        <PasswordReset
          member={resetFor}
          onClose={() => setResetFor(null)}
          onDone={() => setResetFor(null)}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------- ekle/düzenle modal */

function StaffEditor({
  draft,
  setDraft,
  errors,
  saving,
  isSelf,
  onSave,
  onClose,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  errors: Record<string, string>;
  saving: boolean;
  isSelf: boolean;
  onSave: () => void;
  onClose: () => void;
}) {
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft({ ...draft, [k]: v });

  const togglePerm = (key: ModuleKey) => {
    const has = draft.permissions.includes(key);
    set(
      "permissions",
      has
        ? draft.permissions.filter((p) => p !== key)
        : [...draft.permissions, key]
    );
  };

  const isAdmin = draft.role === "admin";

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
            {draft.id ? "Personeli düzenle" : "Yeni personel"}
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
          <Field label="Ad Soyad" required error={errors.fullName}>
            <input
              className={inputCls}
              value={draft.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              placeholder="Örn. Ayşe Yılmaz"
            />
          </Field>

          {draft.id ? (
            <Field label="E-posta">
              <input className={inputCls} value={draft.email} disabled />
            </Field>
          ) : (
            <>
              <Field label="E-posta" required error={errors.email}>
                <input
                  type="email"
                  className={inputCls}
                  value={draft.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="kisi@eposta.com"
                />
              </Field>
              <Field
                label="Geçici şifre"
                required
                error={errors.password}
                hint="En az 8 karakter. Kişiye WhatsApp/telefonla iletin."
              >
                <input
                  type="text"
                  className={inputCls}
                  value={draft.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="En az 8 karakter"
                  autoComplete="new-password"
                />
              </Field>
            </>
          )}

          <Field label="Rol" required>
            <select
              className={inputCls}
              value={draft.role}
              onChange={(e) => set("role", e.target.value as Role)}
              disabled={isSelf}
            >
              <option value="editor">Editör (sınırlı yetki)</option>
              <option value="admin">Admin (tam yetki)</option>
            </select>
          </Field>
          {isSelf && (
            <p className="-mt-2 text-[11px] text-brand-900/50">
              Kendi rolünüzü değiştiremezsiniz.
            </p>
          )}

          {/* Modül izinleri — yalnızca editör için */}
          {!isAdmin && (
            <div className="rounded-xl border border-sand-200 bg-sand-50 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-brand-900/70">
                  Erişebileceği modüller
                </span>
                <div className="flex flex-wrap gap-1">
                  {PRESETS.map((p) => (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => set("permissions", [...p.permissions])}
                      className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-brand-700 ring-1 ring-sand-200 transition hover:bg-brand-50"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-1.5 sm:grid-cols-2">
                {MODULE_KEYS.map((key) => (
                  <label
                    key={key}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white"
                  >
                    <input
                      type="checkbox"
                      checked={draft.permissions.includes(key)}
                      onChange={() => togglePerm(key)}
                      className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-300"
                    />
                    <span className="text-brand-950">{MODULE_LABELS[key]}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {isAdmin && (
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
              Admin tüm modüllere erişir; ayrı izin seçimi gerekmez.
            </p>
          )}
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

/* --------------------------------------------------------- şifre sıfırlama */

function PasswordReset({
  member,
  onClose,
  onDone,
}: {
  member: StaffMember;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setError(null);
    if (password.trim().length < 8) {
      setError("Şifre en az 8 karakter olmalı.");
      return;
    }
    start(async () => {
      const res = await resetStaffPassword({ id: member.id, password });
      if (res.ok) {
        toast.success("Şifre güncellendi.");
        onDone();
      } else if (res.fields?.password) {
        setError(res.fields.password);
      } else {
        toast.error("Şifre güncellenemedi.");
      }
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-brand-950">Şifre sıfırla</h2>
        <p className="mt-1 text-sm text-brand-900/70">
          <strong className="text-brand-950">
            {member.fullName ?? member.email}
          </strong>{" "}
          için yeni bir şifre belirleyin.
        </p>

        <input
          type="text"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Yeni şifre (en az 8 karakter)"
          autoComplete="new-password"
          className={`${inputCls} mt-3`}
        />
        {error && (
          <p className="mt-1.5 text-[11px] font-semibold text-rose-700">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btnSecondary}>
            Vazgeç
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending}
            className={btnPrimary}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
