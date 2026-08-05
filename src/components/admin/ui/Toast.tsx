"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

/**
 * Panel geri bildirimi — tek kaynak (docs/panel-kurallari.md §4:
 * "her işlemde toast (başarı/hata)").
 *
 * Bundan önce panelde üç ayrı geri bildirim dili vardı: yapışkan çubukta yeşil
 * yazı, satır içi kırmızı paragraf ve `window.alert`. Bazı işlemler (görsel
 * yükleme/silme/sıralama, sezon ekleme, tarih kapatma) hiçbir şey göstermiyordu.
 */

type Kind = "success" | "error";
type Item = { id: number; kind: Kind; text: string };

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
}

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast, ToastProvider içinde kullanılmalı.");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const seq = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const push = useCallback(
    (kind: Kind, text: string) => {
      const id = (seq.current += 1);
      setItems((prev) => [...prev, { id, kind, text }]);
      // Hata mesajı daha uzun dursun — kullanıcının okuması gerekiyor.
      window.setTimeout(() => dismiss(id), kind === "error" ? 6000 : 3500);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (text: string) => push("success", text),
      error: (text: string) => push("error", text),
    }),
    [push]
  );

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-3 bottom-3 z-[60] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:items-end"
      >
        {items.map((i) => (
          <div
            key={i.id}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border px-3.5 py-2.5 shadow-lg ${
              i.kind === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-rose-200 bg-rose-50 text-rose-900"
            }`}
          >
            {i.kind === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            )}
            <span className="flex-1 text-sm font-semibold">{i.text}</span>
            <button
              type="button"
              onClick={() => dismiss(i.id)}
              aria-label="Kapat"
              className="rounded p-0.5 opacity-60 transition hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
