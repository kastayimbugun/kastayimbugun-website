"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { addSeason, deleteSeason } from "@/lib/actions/admin/villas";
import { formatPrice, formatDateShort } from "@/lib/format";
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
  const [form, setForm] = useState(empty);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const set = (k: keyof typeof empty, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const add = () => {
    setError(null);
    start(async () => {
      const res = await addSeason({
        villaId,
        labelTr: form.labelTr,
        labelEn: form.labelEn,
        startsOn: form.startsOn,
        endsOn: form.endsOn,
        price: form.price,
      });
      if (res.ok) {
        setForm(empty);
        router.refresh();
      } else {
        setError(
          res.error === "validation"
            ? "Bilgileri kontrol edin (etiketler, tarihler, fiyat)."
            : "Eklenemedi."
        );
      }
    });
  };

  const remove = (id: string) => {
    setError(null);
    start(async () => {
      const res = await deleteSeason({ id, villaId });
      if (res.ok) router.refresh();
      else setError("Silinemedi.");
    });
  };

  const inputCls =
    "rounded-lg border border-sand-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  return (
    <div>
      {seasons.length === 0 ? (
        <p className="text-sm text-brand-900/45">Henüz sezon fiyatı yok.</p>
      ) : (
        <ul className="divide-y divide-sand-100">
          {seasons.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="font-semibold text-brand-900">{s.labelTr}</div>
                <div className="text-sm text-brand-900/55">
                  {formatDateShort(s.startsOn)} – {formatDateShort(s.endsOn)}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-semibold text-brand-950">
                  {formatPrice(s.price)}
                </span>
                <button
                  onClick={() => remove(s.id)}
                  disabled={pending}
                  className="rounded-lg p-1.5 text-brand-900/40 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Ekleme formu */}
      <div className="mt-4 rounded-xl border border-dashed border-sand-300 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <input
            className={inputCls}
            placeholder="Etiket (TR)"
            value={form.labelTr}
            onChange={(e) => set("labelTr", e.target.value)}
          />
          <input
            className={inputCls}
            placeholder="Etiket (EN)"
            value={form.labelEn}
            onChange={(e) => set("labelEn", e.target.value)}
          />
          <input
            className={inputCls}
            type="number"
            min={0}
            placeholder="Gecelik fiyat"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
          />
          <label className="flex flex-col text-[11px] font-semibold text-brand-900/45">
            Başlangıç
            <input
              className={inputCls}
              type="date"
              value={form.startsOn}
              onChange={(e) => set("startsOn", e.target.value)}
            />
          </label>
          <label className="flex flex-col text-[11px] font-semibold text-brand-900/45">
            Bitiş
            <input
              className={inputCls}
              type="date"
              value={form.endsOn}
              onChange={(e) => set("endsOn", e.target.value)}
            />
          </label>
          <button
            onClick={add}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 self-end rounded-lg bg-sun-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-sun-600 disabled:bg-sand-200"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Ekle
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
