"use client";

import { useRef, useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Upload,
  Loader2,
} from "lucide-react";
import {
  emptyFooterColumn,
  type FooterConfig,
  type FooterColumn,
  type FooterColumnType,
} from "@/lib/headerFooter";
import { uploadFooterImage } from "@/lib/actions/admin/site";
import { imageUrl } from "@/lib/images/url";
import type { Region } from "@/lib/data/villas";
import { inputCls } from "./ui/styles";

const iconBtn =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sand-200 text-brand-700 transition hover:bg-brand-50 disabled:opacity-30 disabled:cursor-not-allowed";

const TYPE_LABELS: Record<FooterColumnType, string> = {
  links: "Bağlantı listesi",
  text: "Serbest metin",
  images: "Görsel / SVG",
};

export default function FooterEditor({
  value,
  onChange,
  regions = [],
}: {
  value: FooterConfig;
  onChange: (c: FooterConfig) => void;
  regions?: Region[];
}) {
  const [pending, start] = useTransition();
  const [uploadingCol, setUploadingCol] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  // Açık (genişletilmiş) sütun id'leri — varsayılan hepsi kapalı (derli toplu liste).
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);
  const targetCol = useRef<string | null>(null);

  const toggleOpen = (id: string) =>
    setOpenIds((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const setBrand = (patch: Partial<FooterConfig["brand"]>) =>
    onChange({ ...value, brand: { ...value.brand, ...patch } });
  const setSocial = (patch: Partial<FooterConfig["social"]>) =>
    onChange({ ...value, social: { ...value.social, ...patch } });
  const setColumns = (columns: FooterColumn[]) =>
    onChange({ ...value, columns });

  const updateColumn = (id: string, fn: (c: FooterColumn) => FooterColumn) =>
    setColumns(value.columns.map((c) => (c.id === id ? fn(c) : c)));
  const addColumn = () => {
    const col = emptyFooterColumn("links");
    setColumns([...value.columns, col]);
    // Yeni eklenen sütun düzenlenebilsin diye açık gelsin.
    setOpenIds((s) => new Set(s).add(col.id));
  };
  const removeColumn = (id: string) =>
    setColumns(value.columns.filter((c) => c.id !== id));
  const moveColumn = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.columns.length) return;
    const next = [...value.columns];
    [next[i], next[j]] = [next[j], next[i]];
    setColumns(next);
  };

  // Görsel yükleme: gizli input'u ilgili sütun için tetikle
  const pickImage = (colId: string) => {
    targetCol.current = colId;
    setUploadError(null);
    fileRef.current?.click();
  };
  const onFile = (file: File | undefined) => {
    const colId = targetCol.current;
    if (!file || !colId) return;
    setUploadingCol(colId);
    start(async () => {
      const fd = new FormData();
      fd.set("file", file);
      const res = await uploadFooterImage(fd);
      setUploadingCol(null);
      if (fileRef.current) fileRef.current.value = "";
      if (!res.ok) {
        setUploadError(
          res.error === "toobig"
            ? "Görsel 8 MB'tan büyük olamaz."
            : res.error === "type"
            ? "Dosya kabul edilmedi (güvensiz SVG veya desteklenmeyen tür)."
            : "Yüklenemedi, tekrar deneyin."
        );
        return;
      }
      updateColumn(colId, (c) => ({
        ...c,
        items: [...c.items, { path: res.path, alt: "", href: "" }],
      }));
    });
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,.svg"
        hidden
        onChange={(e) => onFile(e.target.files?.[0])}
      />

      {/* Marka bloğu */}
      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <h4 className="text-sm font-bold text-brand-950">Marka bloğu</h4>
        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value.brand.showLogo}
            onChange={(e) => setBrand({ showLogo: e.target.checked })}
            className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
          />
          <span className="text-sm text-brand-900/85">Logoyu göster</span>
        </label>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <textarea
            className={`${inputCls} min-h-16 resize-y`}
            placeholder="Tanıtım metni (TR)"
            value={value.brand.taglineTr}
            onChange={(e) => setBrand({ taglineTr: e.target.value })}
          />
          <textarea
            className={`${inputCls} min-h-16 resize-y`}
            placeholder="Tanıtım metni (EN)"
            value={value.brand.taglineEn}
            onChange={(e) => setBrand({ taglineEn: e.target.value })}
          />
        </div>
      </div>

      {/* Sosyal medya */}
      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <h4 className="text-sm font-bold text-brand-950">Sosyal medya</h4>
        <p className="mb-3 mt-1 text-xs text-brand-900/60">
          Boş bırakılan hesap footer&apos;da gösterilmez.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              ["instagram", "Instagram"],
              ["facebook", "Facebook"],
              ["youtube", "YouTube"],
              ["x", "X (Twitter)"],
              ["whatsapp", "WhatsApp"],
            ] as [keyof FooterConfig["social"], string][]
          ).map(([key, label]) => (
            <input
              key={key}
              className={inputCls}
              placeholder={`${label} bağlantısı`}
              value={value.social[key]}
              onChange={(e) => setSocial({ [key]: e.target.value })}
            />
          ))}
        </div>
      </div>

      {/* Sütunlar */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-bold text-brand-950">Footer sütunları</h4>
          <button
            type="button"
            onClick={addColumn}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" /> Sütun ekle
          </button>
        </div>
        {uploadError && (
          <p className="mb-2 text-xs text-rose-600">{uploadError}</p>
        )}

        <div className="space-y-3">
          {value.columns.map((col, i) => (
            <div
              key={col.id}
              className="rounded-xl border border-sand-200 bg-white p-4"
            >
              {/* Sütun başlığı satırı — ok en solda sabit, gerisi yanında sarmalanır */}
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  onClick={() => toggleOpen(col.id)}
                  className={`${iconBtn} shrink-0`}
                  aria-label={openIds.has(col.id) ? "Kapat" : "Aç"}
                  aria-expanded={openIds.has(col.id)}
                  title={openIds.has(col.id) ? "İçeriği gizle" : "İçeriği düzenle"}
                >
                  <ChevronRight
                    className={`h-4 w-4 transition-transform ${
                      openIds.has(col.id) ? "rotate-90" : ""
                    }`}
                  />
                </button>
                <div className="flex flex-1 flex-wrap items-center gap-2">
                <select
                  className={`${inputCls} w-auto`}
                  value={col.type}
                  onChange={(e) =>
                    updateColumn(col.id, (c) => ({
                      ...c,
                      type: e.target.value as FooterColumnType,
                    }))
                  }
                >
                  {(Object.keys(TYPE_LABELS) as FooterColumnType[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Başlık (TR)"
                  value={col.titleTr}
                  onChange={(e) =>
                    updateColumn(col.id, (c) => ({ ...c, titleTr: e.target.value }))
                  }
                />
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Başlık (EN)"
                  value={col.titleEn}
                  onChange={(e) =>
                    updateColumn(col.id, (c) => ({ ...c, titleEn: e.target.value }))
                  }
                />
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveColumn(i, -1)}
                    disabled={i === 0}
                    className={iconBtn}
                    aria-label="Yukarı"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveColumn(i, 1)}
                    disabled={i === value.columns.length - 1}
                    className={iconBtn}
                    aria-label="Aşağı"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeColumn(col.id)}
                    className={`${iconBtn} hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`}
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                </div>
              </div>

              {/* Tipe göre içerik — yalnızca sütun açıkken */}
              {openIds.has(col.id) && (
              <div className="mt-3">
                {col.type === "text" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <textarea
                      className={`${inputCls} min-h-20 resize-y`}
                      placeholder="Metin (TR)"
                      value={col.bodyTr}
                      onChange={(e) =>
                        updateColumn(col.id, (c) => ({ ...c, bodyTr: e.target.value }))
                      }
                    />
                    <textarea
                      className={`${inputCls} min-h-20 resize-y`}
                      placeholder="Metin (EN)"
                      value={col.bodyEn}
                      onChange={(e) =>
                        updateColumn(col.id, (c) => ({ ...c, bodyEn: e.target.value }))
                      }
                    />
                  </div>
                )}

                {col.type === "links" && (
                  <LinksEditor
                    col={col}
                    regions={regions}
                    onChange={(fn) => updateColumn(col.id, fn)}
                  />
                )}

                {col.type === "images" && (
                  <ImagesEditor
                    col={col}
                    uploading={uploadingCol === col.id && pending}
                    onPick={() => pickImage(col.id)}
                    onChange={(fn) => updateColumn(col.id, fn)}
                  />
                )}
              </div>
              )}
            </div>
          ))}
          {value.columns.length === 0 && (
            <p className="text-sm text-brand-900/50">Henüz sütun yok.</p>
          )}
        </div>
      </div>

      {/* Alt telif metni */}
      <div className="rounded-xl border border-sand-200 bg-white p-4">
        <h4 className="text-sm font-bold text-brand-950">Alt telif metni</h4>
        <p className="mb-3 mt-1 text-xs text-brand-900/60">
          Yıl ve marka adı otomatik eklenir; buraya kalan metni yazın.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className={inputCls}
            placeholder="Telif metni (TR)"
            value={value.bottomTextTr}
            onChange={(e) => onChange({ ...value, bottomTextTr: e.target.value })}
          />
          <input
            className={inputCls}
            placeholder="Telif metni (EN)"
            value={value.bottomTextEn}
            onChange={(e) => onChange({ ...value, bottomTextEn: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}

/** Bağlantı listesi (elle) veya hazır kaynak seçimi. */
function LinksEditor({
  col,
  regions,
  onChange,
}: {
  col: FooterColumn;
  regions: Region[];
  onChange: (fn: (c: FooterColumn) => FooterColumn) => void;
}) {
  const addLink = () =>
    onChange((c) => ({
      ...c,
      links: [...c.links, { labelTr: "", labelEn: "", href: "#" }],
    }));
  const updateLink = (i: number, patch: Partial<FooterColumn["links"][number]>) =>
    onChange((c) => ({
      ...c,
      links: c.links.map((l, idx) => (idx === i ? { ...l, ...patch } : l)),
    }));
  const removeLink = (i: number) =>
    onChange((c) => ({ ...c, links: c.links.filter((_, idx) => idx !== i) }));

  return (
    <div>
      <label className="mb-2 block text-xs font-medium text-brand-900/70">
        Kaynak
      </label>
      <select
        className={`${inputCls} mb-3 w-auto`}
        value={col.autoSource ?? "manual"}
        onChange={(e) =>
          onChange((c) => ({
            ...c,
            autoSource:
              e.target.value === "manual"
                ? null
                : (e.target.value as "regions" | "pages"),
          }))
        }
      >
        <option value="manual">Elle bağlantılar</option>
        <option value="regions">Bölgeler (otomatik)</option>
        <option value="pages">Sayfalar (otomatik)</option>
      </select>

      {col.autoSource === "regions" ? (
        <RegionPicker col={col} regions={regions} onChange={onChange} />
      ) : col.autoSource === "pages" ? (
        <p className="text-xs text-brand-900/50">
          Bu sütun yasal/kurumsal sayfalar listesinden otomatik dolar.
        </p>
      ) : (
        <div className="space-y-2">
          {col.links.map((l, i) => (
            <div
              key={i}
              className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]"
            >
              <input
                className={inputCls}
                placeholder="Etiket (TR)"
                value={l.labelTr}
                onChange={(e) => updateLink(i, { labelTr: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Etiket (EN)"
                value={l.labelEn}
                onChange={(e) => updateLink(i, { labelEn: e.target.value })}
              />
              <input
                className={inputCls}
                placeholder="Bağlantı"
                value={l.href}
                onChange={(e) => updateLink(i, { href: e.target.value })}
              />
              <button
                type="button"
                onClick={() => removeLink(i)}
                className={`${iconBtn} hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`}
                aria-label="Sil"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-brand-200 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" /> Bağlantı ekle
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Footer "Bölgeler" sütunu için bölge seçimi. `regionSlugs` null iken tüm
 * bölgeler gösterilir; kullanıcı seçim yapınca yalnızca işaretlenenler footer'da
 * çıkar (bölge sırası render'da korunur).
 */
function RegionPicker({
  col,
  regions,
  onChange,
}: {
  col: FooterColumn;
  regions: Region[];
  onChange: (fn: (c: FooterColumn) => FooterColumn) => void;
}) {
  // null ⇒ hepsi seçili say (görünen davranış "tümü").
  const allSlugs = regions.map((r) => r.slug);
  const selected = col.regionSlugs == null ? allSlugs : col.regionSlugs;
  const selectedSet = new Set(selected);

  const setSlugs = (slugs: string[] | null) =>
    onChange((c) => ({ ...c, regionSlugs: slugs }));

  const toggle = (slug: string, checked: boolean) => {
    const next = new Set(selectedSet);
    if (checked) next.add(slug);
    else next.delete(slug);
    // Bölge sırasını koru.
    setSlugs(allSlugs.filter((s) => next.has(s)));
  };

  if (regions.length === 0) {
    return (
      <p className="text-xs text-brand-900/50">
        Henüz bölge bulunmuyor. Bölge eklendiğinde burada seçebilirsiniz.
      </p>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSlugs(null)}
          className="rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-sand-50"
        >
          Tümünü seç
        </button>
        <button
          type="button"
          onClick={() => setSlugs([])}
          className="rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-800 hover:bg-sand-50"
        >
          Temizle
        </button>
        <span className="text-xs text-brand-900/55">
          {col.regionSlugs == null ? "Tümü" : selectedSet.size} / {regions.length}{" "}
          bölge footer&apos;da
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-xl border border-sand-200 bg-white">
        <div className="divide-y divide-sand-200">
          {regions.map((r) => (
            <label
              key={r.slug}
              className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-sand-50"
              style={{ paddingLeft: `${16 + (r.depth ?? 0) * 20}px` }}
            >
              <input
                type="checkbox"
                checked={selectedSet.has(r.slug)}
                onChange={(e) => toggle(r.slug, e.target.checked)}
                className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="min-w-0 truncate font-medium text-brand-950">
                {r.name}
              </span>
              {r.province && (
                <span className="shrink-0 text-xs text-brand-900/50">
                  {r.province}
                </span>
              )}
            </label>
          ))}
        </div>
      </div>

      {col.regionSlugs != null && selectedSet.size === 0 && (
        <p className="mt-2 text-xs font-medium text-amber-600">
          ⚠️ Hiçbir bölge seçili değil — bu sütun footer&apos;da boş görünecek.
        </p>
      )}
    </div>
  );
}

/** Görsel/SVG rozetleri (TÜRSAB, sertifika, ödeme ikonları). */
function ImagesEditor({
  col,
  uploading,
  onPick,
  onChange,
}: {
  col: FooterColumn;
  uploading: boolean;
  onPick: () => void;
  onChange: (fn: (c: FooterColumn) => FooterColumn) => void;
}) {
  const updateItem = (i: number, patch: Partial<FooterColumn["items"][number]>) =>
    onChange((c) => ({
      ...c,
      items: c.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  const removeItem = (i: number) =>
    onChange((c) => ({ ...c, items: c.items.filter((_, idx) => idx !== i) }));

  return (
    <div className="space-y-2">
      {col.items.map((it, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg border border-sand-200 p-2"
        >
          <span className="flex h-12 w-16 shrink-0 items-center justify-center overflow-hidden rounded bg-sand-100">
            {imageUrl(it.path) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl(it.path)!}
                alt={it.alt}
                className="h-full w-full object-contain"
              />
            )}
          </span>
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <input
              className={inputCls}
              placeholder="Açıklama (alt)"
              value={it.alt}
              onChange={(e) => updateItem(i, { alt: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder="Bağlantı (opsiyonel)"
              value={it.href}
              onChange={(e) => updateItem(i, { href: e.target.value })}
            />
          </div>
          <button
            type="button"
            onClick={() => removeItem(i)}
            className={`${iconBtn} hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600`}
            aria-label="Sil"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={onPick}
        disabled={uploading}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-brand-300 px-3 py-1.5 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        Görsel / SVG yükle
      </button>
    </div>
  );
}
