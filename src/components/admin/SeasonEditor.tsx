"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Loader2, X, CalendarRange } from "lucide-react";
import { addSeason, updateSeason, deleteSeason } from "@/lib/actions/admin/villas";
import { formatPrice, formatDateShort } from "@/lib/format";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { EmptyState } from "@/components/admin/ui/PageHeader";
import { Field } from "@/components/admin/ui/FormField";
import {
  btnPrimary,
  btnSecondary,
  btnIcon,
  btnIconDanger,
  inputCls,
} from "@/components/admin/ui/styles";
import type { AdminSeason } from "@/lib/data/admin/villas";

const empty = {
  labelTr: "",
  labelEn: "",
  startsOn: "",
  endsOn: "",
  price: "",
};

export default function SeasonEditor({
  villaId,
  seasons,
}: {
  villaId: string;
  seasons: AdminSeason[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  const set = (k: keyof typeof empty, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const startEdit = (s: AdminSeason) => {
    setErrors({});
    setEditId(s.id);
    setForm({
      labelTr: s.labelTr,
      labelEn: s.labelEn,
      startsOn: s.startsOn,
      endsOn: s.endsOn,
      price: String(s.price),
    });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(empty);
    setErrors({});
  };

  const save = () => {
    setErrors({});
    start(async () => {
      const res = editId
        ? await updateSeason({ id: editId, villaId, ...form })
        : await addSeason({ villaId, ...form });

      if (res.ok) {
        toast.success(editId ? "Sezon fiyatı güncellendi." : "Sezon fiyatı eklendi.");
        cancelEdit();
        router.refresh();
        return;
      }
      if (res.fields && Object.keys(res.fields).length > 0) {
        setErrors(res.fields);
        toast.error("Bazı alanlar eksik veya hatalı.");
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : editId
              ? "Güncellenemedi."
              : "Eklenemedi."
        );
      }
    });
  };

  const remove = async (s: AdminSeason) => {
    const ok = await confirm({
      title: "Sezon fiyatı silinsin mi?",
      body: `"${s.labelTr}" (${formatDateShort(s.startsOn)} – ${formatDateShort(
        s.endsOn
      )}) silinecek. Bu tarihlerde villanın taban fiyatı geçerli olur.`,
      confirmLabel: "Sil",
      tone: "danger",
    });
    if (!ok) return;

    start(async () => {
      const res = await deleteSeason({ id: s.id, villaId });
      if (res.ok) {
        toast.success("Sezon fiyatı silindi.");
        if (editId === s.id) cancelEdit();
        router.refresh();
      } else {
        toast.error("Silinemedi.");
      }
    });
  };

  return (
    <div>
      {seasons.length === 0 ? (
        <EmptyState
          icon={CalendarRange}
          title="Henüz sezon fiyatı yok"
          description="Sezon tanımlanmayan tarihlerde villanın taban gecelik fiyatı geçerlidir."
        />
      ) : (
        <ul className="divide-y divide-sand-100">
          {seasons.map((s) => (
            <li
              key={s.id}
              className={`flex items-center justify-between gap-3 py-2.5 ${
                editId === s.id ? "-mx-3 rounded-lg bg-brand-50 px-3" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="font-semibold text-brand-900">{s.labelTr}</div>
                <div className="text-sm text-brand-900/70">
                  {formatDateShort(s.startsOn)} – {formatDateShort(s.endsOn)}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="mr-2 font-semibold text-brand-950">
                  {formatPrice(s.price)}
                </span>
                <button
                  type="button"
                  onClick={() => startEdit(s)}
                  className={btnIcon}
                  aria-label={`${s.labelTr} sezonunu düzenle`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => void remove(s)}
                  disabled={pending}
                  className={btnIconDanger}
                  aria-label={`${s.labelTr} sezonunu sil`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Ekle / düzenle formu — aynı form ikisi için de kullanılır */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className={`mt-4 rounded-xl border p-3 ${
          editId
            ? "border-brand-300 bg-brand-50/40"
            : "border-dashed border-sand-300"
        }`}
      >
        {editId && (
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wide text-brand-700">
              Sezonu düzenliyorsunuz
            </span>
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-1 rounded text-sm font-semibold text-brand-700 hover:underline focus-visible:ring-2 focus-visible:ring-brand-300"
            >
              <X className="h-3.5 w-3.5" /> Vazgeç
            </button>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field
            label="Etiket (TR)"
            required
            error={errors.labelTr}
            hint="Bu dönemin görünen adı, ör. Yüksek Sezon."
          >
            <input
              className={inputCls}
              placeholder="Ör. Yüksek Sezon"
              value={form.labelTr}
              onChange={(e) => set("labelTr", e.target.value)}
            />
          </Field>
          <Field
            label="Etiket (EN)"
            required
            error={errors.labelEn}
            hint="Aynı adın İngilizcesi, ör. High Season."
          >
            <input
              className={inputCls}
              placeholder="Ör. High Season"
              value={form.labelEn}
              onChange={(e) => set("labelEn", e.target.value)}
            />
          </Field>
          <Field label="Gecelik fiyat (₺)" required error={errors.price}>
            <input
              className={inputCls}
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
            />
          </Field>
          <Field label="Başlangıç" required error={errors.startsOn}>
            <input
              className={inputCls}
              type="date"
              value={form.startsOn}
              onChange={(e) => set("startsOn", e.target.value)}
            />
          </Field>
          <Field label="Bitiş" required error={errors.endsOn}>
            <input
              className={inputCls}
              type="date"
              value={form.endsOn}
              onChange={(e) => set("endsOn", e.target.value)}
            />
          </Field>
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={pending}
              className={`${btnPrimary} w-full`}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editId ? (
                <Pencil className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editId ? "Kaydet" : "Ekle"}
            </button>
            {editId && (
              <button
                type="button"
                onClick={cancelEdit}
                className={btnSecondary}
                aria-label="Vazgeç"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
