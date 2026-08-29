"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2, Tag, CalendarX } from "lucide-react";
import { bulkSetSeason, bulkSetAvailability } from "@/lib/actions/admin/bulk";
import { formatDate } from "@/lib/format";
import { Field } from "@/components/admin/ui/FormField";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { inputCls } from "@/components/admin/ui/styles";
import type { VillaOption } from "@/lib/data/admin/villas";

type Mode = "price" | "availability";

/**
 * Toplu güncelleme (yol haritası 3.3): tarih aralığı + çoklu villa seçip
 * fiyat/min-gece yaz ya da toplu kapat-aç. Sezon başında en yoğun panel işi.
 *
 * Villa seçimi aramalı — 600 villada düz liste kullanılamaz.
 */
/**
 * yyyy-mm-dd + 1 gun.
 *
 * `villa_blocks` ve `villa_seasons` yari-acik aralik kullanir: [starts_on, ends_on).
 * Yani "31 Agustos gecesi" dahil olsun isteniyorsa `ends_on` 1 Eylul olmali.
 * BlockEditor ve MultiCalendar bunu zaten yapiyordu; toplu guncelleme yapmiyordu
 * ve secilen son gece 40 villada birden ACIK kaliyordu (sezon fiyatinda da son
 * gece taban fiyata dusuyordu).
 */
function addDay(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export default function BulkUpdatePanel({
  villas,
}: {
  villas: VillaOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const [mode, setMode] = useState<Mode>("price");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [price, setPrice] = useState("");
  const [minNights, setMinNights] = useState("");
  const [label, setLabel] = useState("");
  const [note, setNote] = useState("");
  const [closeMode, setCloseMode] = useState<"close" | "open">("close");
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Sunucu semasi tek islemde en fazla 200 villa kabul ediyor
   * (`schemas/adminBulk.ts`). Arayuz bunu bilmedigi icin "hepsini sec" 600 villa
   * seciyor, sunucu reddediyor ve hata `errors.villaIds`'e yaziliyordu — ama onu
   * gosteren bir alan olmadigi icin kullanici "isaretli yerlere bakin" mesajini
   * gorup hicbir isaret bulamiyordu. Sinir artik secim aninda uygulaniyor.
   */
  const MAX_BULK = 200;

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("tr");
    if (!q) return villas;
    return villas.filter((v) => v.name.toLocaleLowerCase("tr").includes(q));
  }, [villas, query]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectAllFiltered = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      let hitLimit = false;
      for (const v of filtered) {
        if (next.size >= MAX_BULK && !next.has(v.id)) {
          hitLimit = true;
          break;
        }
        next.add(v.id);
      }
      if (hitLimit) {
        toast.error(
          `Tek seferde en fazla ${MAX_BULK} villa islenebilir — ilk ${MAX_BULK} tanesi secildi.`
        );
      }
      return next;
    });

  const clearSelection = () => setSelected(new Set());

  const apply = async () => {
    setErrors({});
    const villaIds = [...selected];

    if (villaIds.length === 0) {
      toast.error("En az bir villa seçin.");
      return;
    }

    // Tarih bos birakilirsa asagidaki onay metnindeki formatDate("") gecersiz
    // tarihte RangeError firlatiyor; hata yakalanmadan promise'e dusuyor ve
    // butona basilmis gibi hicbir sey olmuyordu.
    if (!from || !to) {
      toast.error("Başlangıç ve bitiş tarihi seçin.");
      return;
    }
    if (to < from) {
      toast.error("Bitiş tarihi başlangıçtan önce olamaz.");
      return;
    }

    if (mode === "price") {
      const ok = await confirm({
        title: "Toplu fiyat uygulansın mı?",
        body: `${villaIds.length} villada ${formatDate(from)} – ${formatDate(
          to
        )} tarihine denk gelen mevcut sezon fiyatları bu yeni fiyatla değiştirilecek.`,
        confirmLabel: "Uygula",
      });
      if (!ok) return;

      start(async () => {
        const res = await bulkSetSeason({
          villaIds,
          from,
          // Kullanicinin sectigi son GECE dahil olmali (yari-acik aralik).
          to: addDay(to),
          price,
          minNights,
          label,
        });
        handle(res, "Fiyat uygulandı");
      });
      return;
    }

    // availability
    if (closeMode === "close") {
      const ok = await confirm({
        title: "Seçili tarihler kapatılsın mı?",
        body: `${villaIds.length} villada ${formatDate(from)} – ${formatDate(
          to
        )} kapatılacak. Zaten dolu/kapalı olan villalar atlanır.`,
        confirmLabel: "Kapat",
        tone: "danger",
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: "Seçili tarihler açılsın mı?",
        body: `${villaIds.length} villada ${formatDate(from)} – ${formatDate(
          to
        )} aralığındaki elle kapatmalar kaldırılacak. Onaylı rezervasyonlar korunur.`,
        confirmLabel: "Aç",
        tone: "danger",
      });
      if (!ok) return;
    }

    start(async () => {
      const res = await bulkSetAvailability({
        villaIds,
        from,
        // Kullanicinin sectigi son GECE dahil olmali (yari-acik aralik).
        to: addDay(to),
        mode: closeMode,
        note,
      });
      handle(res, closeMode === "close" ? "Tarihler kapatıldı" : "Tarihler açıldı");
    });
  };

  const handle = (
    res: Awaited<ReturnType<typeof bulkSetSeason>>,
    successVerb: string
  ) => {
    if (res.ok) {
      const extra = res.skipped > 0 ? ` · ${res.skipped} villa atlandı (dolu)` : "";
      toast.success(`${successVerb}: ${res.applied} villa${extra}.`);
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
          : "İşlem başarısız."
      );
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Sol: ne yapılacak */}
      <div className="space-y-5">
        {/* Mod seçimi */}
        <div className="inline-flex rounded-xl border border-sand-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setMode("price")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "price"
                ? "bg-brand-700 text-white"
                : "text-brand-800 hover:bg-sand-50"
            }`}
          >
            <Tag className="h-4 w-4" />
            Fiyat / min. gece
          </button>
          <button
            type="button"
            onClick={() => setMode("availability")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "availability"
                ? "bg-brand-700 text-white"
                : "text-brand-800 hover:bg-sand-50"
            }`}
          >
            <CalendarX className="h-4 w-4" />
            Kapat / Aç
          </button>
        </div>

        {/* Tarih aralığı */}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Başlangıç" required error={errors.from}>
            <input
              type="date"
              className={inputCls}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </Field>
          <Field label="Bitiş" required error={errors.to}>
            <input
              type="date"
              className={inputCls}
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </Field>
        </div>

        {mode === "price" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Gecelik fiyat (₺)" required error={errors.price}>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </Field>
            <Field
              label="Min. gece"
              hint="Boşsa villa varsayılanı"
              error={errors.minNights}
            >
              <input
                type="number"
                min={1}
                className={inputCls}
                value={minNights}
                onChange={(e) => setMinNights(e.target.value)}
              />
            </Field>
            <Field label="Sezon etiketi" required error={errors.label}>
              <input
                className={inputCls}
                value={label}
                placeholder="Ör. Yüksek sezon"
                onChange={(e) => setLabel(e.target.value)}
              />
            </Field>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="İşlem">
              <select
                className={inputCls}
                value={closeMode}
                onChange={(e) => setCloseMode(e.target.value as "close" | "open")}
              >
                <option value="close">Tarihleri kapat</option>
                <option value="open">Tarihleri aç (elle kapatmaları kaldır)</option>
              </select>
            </Field>
            {closeMode === "close" && (
              <Field label="Kapatma notu" error={errors.note}>
                <input
                  className={inputCls}
                  value={note}
                  placeholder="Ör. X Turizm"
                  onChange={(e) => setNote(e.target.value)}
                />
              </Field>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => void apply()}
          disabled={pending || selected.size === 0}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-brand-900/50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {selected.size > 0
            ? `${selected.size} villaya uygula`
            : "Önce villa seçin"}
        </button>
      </div>

      {/* Sağ: villa seçimi */}
      <div className="rounded-2xl border border-sand-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-bold text-brand-950">
            Villalar{" "}
            <span className="font-normal text-brand-900/70">
              ({selected.size} seçili)
            </span>
          </span>
          {selected.size > 0 && (
            <button
              type="button"
              onClick={clearSelection}
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              Temizle
            </button>
          )}
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-900/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Villa ara…"
            className={`${inputCls} pl-8`}
          />
        </div>

        <button
          type="button"
          onClick={selectAllFiltered}
          className="mt-2 text-xs font-semibold text-brand-700 hover:underline"
        >
          Görünenlerin hepsini seç ({filtered.length})
        </button>

        <ul className="mt-2 max-h-80 space-y-0.5 overflow-y-auto">
          {filtered.map((v) => (
            <li key={v.id}>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-sand-50">
                <input
                  type="checkbox"
                  checked={selected.has(v.id)}
                  onChange={() => toggle(v.id)}
                  className="h-4 w-4 rounded border-sand-300 text-brand-600 focus:ring-brand-300"
                />
                <span className="truncate text-brand-900">{v.name}</span>
              </label>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-2 py-3 text-sm text-brand-900/60">
              Eşleşen villa yok.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
