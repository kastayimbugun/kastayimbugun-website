"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarX, Loader2, Lock } from "lucide-react";
import { addBlock, removeBlock } from "@/lib/actions/admin/villas";
import { formatDateShort } from "@/lib/format";
import type { AdminBlock } from "@/lib/data/admin/villas";

export default function BlockEditor({
  villaId,
  blocks,
}: {
  villaId: string;
  blocks: AdminBlock[];
}) {
  const router = useRouter();
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const close = () => {
    setError(null);
    start(async () => {
      const res = await addBlock({ villaId, startsOn, endsOn, note });
      if (res.ok) {
        setStartsOn("");
        setEndsOn("");
        setNote("");
        router.refresh();
      } else {
        setError(
          res.error === "conflict"
            ? "Bu tarihler zaten kapalı/dolu."
            : res.error === "validation"
              ? "Tarihleri kontrol edin."
              : "Kapatılamadı."
        );
      }
    });
  };

  const open = (id: string) => {
    setError(null);
    start(async () => {
      const res = await removeBlock({ id, villaId });
      if (res.ok) router.refresh();
      else setError("Açılamadı.");
    });
  };

  const inputCls =
    "rounded-lg border border-sand-200 bg-white px-2.5 py-2 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100";

  return (
    <div>
      {blocks.length === 0 ? (
        <p className="text-sm text-brand-900/45">Kapalı tarih yok.</p>
      ) : (
        <ul className="divide-y divide-sand-100">
          {blocks.map((b) => (
            <li
              key={b.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div>
                <div className="font-semibold text-brand-900">
                  {formatDateShort(b.startsOn)} – {formatDateShort(b.endsOn)}
                </div>
                <div className="text-xs text-brand-900/50">
                  {b.source === "booking"
                    ? "Onaylı rezervasyon"
                    : b.note || "Elle kapatıldı"}
                </div>
              </div>
              {b.source === "booking" ? (
                <span
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-brand-900/40"
                  title="Talepler ekranından yönetilir"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Rezervasyon
                </span>
              ) : (
                <button
                  onClick={() => open(b.id)}
                  disabled={pending}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                >
                  Aç
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Tarih kapatma formu */}
      <div className="mt-4 rounded-xl border border-dashed border-sand-300 p-3">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <label className="flex flex-col text-[11px] font-semibold text-brand-900/45">
            Başlangıç
            <input
              className={inputCls}
              type="date"
              value={startsOn}
              onChange={(e) => setStartsOn(e.target.value)}
            />
          </label>
          <label className="flex flex-col text-[11px] font-semibold text-brand-900/45">
            Bitiş (dahil değil)
            <input
              className={inputCls}
              type="date"
              value={endsOn}
              onChange={(e) => setEndsOn(e.target.value)}
            />
          </label>
          <input
            className={`${inputCls} self-end`}
            placeholder="Not (opsiyonel)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={close}
            disabled={pending}
            className="flex items-center justify-center gap-1.5 self-end rounded-lg bg-brand-700 px-3 py-2 text-sm font-bold text-white transition hover:bg-brand-800 disabled:bg-sand-200"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarX className="h-4 w-4" />
            )}
            Kapat
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
