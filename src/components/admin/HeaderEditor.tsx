"use client";

import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { newId, type HeaderConfig, type MenuItem } from "@/lib/headerFooter";
import { inputCls } from "./ui/styles";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sand-200 text-brand-700 transition hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed";

export default function HeaderEditor({
  value,
  onChange,
}: {
  value: HeaderConfig;
  onChange: (c: HeaderConfig) => void;
}) {
  const setTopbar = (patch: Partial<HeaderConfig["topbar"]>) =>
    onChange({ ...value, topbar: { ...value.topbar, ...patch } });
  const setCta = (patch: Partial<HeaderConfig["cta"]>) =>
    onChange({ ...value, cta: { ...value.cta, ...patch } });
  const setMenu = (menu: MenuItem[]) => onChange({ ...value, menu });

  const updateItem = (i: number, patch: Partial<MenuItem>) =>
    setMenu(value.menu.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  const addItem = () =>
    setMenu([...value.menu, { id: newId(), labelTr: "", labelEn: "", href: "/" }]);
  const removeItem = (i: number) =>
    setMenu(value.menu.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.menu.length) return;
    const next = [...value.menu];
    [next[i], next[j]] = [next[j], next[i]];
    setMenu(next);
  };

  return (
    <div className="space-y-6">
      {/* Üst güven şeridi */}
      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.topbar.enabled}
            onChange={(e) => setTopbar({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-semibold text-brand-950">
            Üst güven şeridini göster (TÜRSAB)
          </span>
        </label>
        {value.topbar.enabled && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Metin (TR)"
              value={value.topbar.textTr}
              onChange={(e) => setTopbar({ textTr: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Metin (EN)"
              value={value.topbar.textEn}
              onChange={(e) => setTopbar({ textEn: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Rozet (TR) — ör. TÜRSAB Belge No: 17305"
              value={value.topbar.badgeTr}
              onChange={(e) => setTopbar({ badgeTr: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Rozet (EN)"
              value={value.topbar.badgeEn}
              onChange={(e) => setTopbar({ badgeEn: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Menü öğeleri */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-bold text-brand-950">Menü öğeleri</h4>
          <button
            type="button"
            onClick={addItem}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" /> Menü ekle
          </button>
        </div>
        <div className="space-y-2">
          {value.menu.map((m, i) => (
            <div
              key={m.id}
              className="grid items-center gap-2 rounded-xl border border-sand-200 bg-white p-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <input
                className={inputCls}
                placeholder="Etiket (TR)"
                value={m.labelTr}
                onChange={(e) => updateItem(i, { labelTr: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Etiket (EN)"
                value={m.labelEn}
                onChange={(e) => updateItem(i, { labelEn: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Bağlantı — /villalar veya /#about"
                value={m.href}
                onChange={(e) => updateItem(i, { href: e.target.value })}
              />
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className={iconBtn}
                  aria-label="Yukarı"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(i, 1)}
                  disabled={i === value.menu.length - 1}
                  className={iconBtn}
                  aria-label="Aşağı"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className={`${iconBtn} hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`}
                  aria-label="Sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {value.menu.length === 0 && (
            <p className="text-sm text-brand-900/50">Henüz menü öğesi yok.</p>
          )}
        </div>
      </div>

      {/* Vurgu butonu */}
      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.cta.enabled}
            onChange={(e) => setCta({ enabled: e.target.checked })}
            className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm font-semibold text-brand-950">
            Sağdaki vurgu butonunu göster (Giriş Yap)
          </span>
        </label>
        {value.cta.enabled && (
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <input
              className={inputCls}
              placeholder="Etiket (TR)"
              value={value.cta.labelTr}
              onChange={(e) => setCta({ labelTr: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Etiket (EN)"
              value={value.cta.labelEn}
              onChange={(e) => setCta({ labelEn: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Bağlantı"
              value={value.cta.href}
              onChange={(e) => setCta({ href: e.target.value })}
            />
          </div>
        )}
      </div>
    </div>
  );
}
