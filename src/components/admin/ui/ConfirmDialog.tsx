"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle } from "lucide-react";
import { btnDanger, btnSecondary, btnPrimary } from "./styles";

/**
 * Yıkıcı işlem onayı — tek kaynak (docs/panel-kurallari.md §3:
 * "Yıkıcı işlemlerde onay: arşivleme, görsel silme, talep iptali → açık
 * 'emin misiniz?' adımı").
 *
 * `window.confirm` yerine geçer: panel diline uyar, ne olacağını açıklayabilir,
 * mobilde düzgün görünür. Native `<dialog>` kullanır → odak tuzağı ve Esc
 * davranışı tarayıcıdan gelir.
 *
 * Kullanım:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "…", body: "…", tone: "danger" }))) return;
 */

export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm, ConfirmProvider içinde kullanılmalı.");
  return ctx;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (opts && !el.open) el.showModal();
    if (!opts && el.open) el.close();
  }, [opts]);

  // Hem butonlar hem Esc/backdrop buradan geçer. resolver tek sefer çağrılır;
  // dialog kapanınca tetiklenen onClose ikinci kez gelirse zararsızdır.
  const settle = useCallback((value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOpts(null);
  }, []);

  const danger = opts?.tone === "danger";

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <dialog
        ref={dialogRef}
        onCancel={(e) => {
          e.preventDefault();
          settle(false);
        }}
        onClose={() => settle(false)}
        aria-labelledby="confirm-title"
        /*
         * `m-auto` şart: Tailwind reset'i her elemana `margin: 0` verdiği için
         * tarayıcının modal <dialog> için uyguladığı `margin: auto` ezilir ve
         * kutu sol üst köşeye yapışır. Bunu geri koyar (inset:0 UA'dan gelir).
         */
        className="m-auto max-h-[calc(100dvh-2rem)] w-[min(26rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-sand-200 bg-white p-0 text-brand-950 shadow-2xl backdrop:bg-brand-950/40"
      >
        {opts && (
          <div className="p-5">
            <div className="flex gap-3">
              {danger && (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50">
                  <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />
                </span>
              )}
              <div className="min-w-0">
                <h2
                  id="confirm-title"
                  className="text-base font-bold text-brand-950"
                >
                  {opts.title}
                </h2>
                {opts.body && (
                  <div className="mt-1.5 text-sm leading-relaxed text-brand-900/70">
                    {opts.body}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => settle(false)}
                className={btnSecondary}
              >
                {opts.cancelLabel ?? "Vazgeç"}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => settle(true)}
                className={danger ? btnDanger : btnPrimary}
              >
                {opts.confirmLabel ?? "Devam et"}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </ConfirmCtx.Provider>
  );
}
