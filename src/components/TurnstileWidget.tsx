"use client";

import { useEffect, useId, useRef } from "react";

/**
 * Cloudflare Turnstile widget'ı — herkese açık formların spam koruması.
 *
 * Neden gerekli: sunucu (`lib/security/turnstile.ts`) üretimde token YOKSA
 * gönderimi reddeder. Bu bileşen eklenmeden `TURNSTILE_SECRET_KEY` tanımlanırsa
 * gerçek müşterilerin tamamı "Talep gönderilemedi" hatası alır — denetimin
 * "zaman bombası" diye işaretlediği durum tam olarak buydu.
 *
 * `NEXT_PUBLIC_TURNSTILE_SITE_KEY` tanımlı değilse hiçbir şey render etmez ve
 * token üretmez; geliştirmede sunucu da atladığı için form çalışmaya devam eder.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
          language?: string;
        }
      ) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;

/** Script'i bir kez yükler; aynı sayfadaki birden çok widget aynı sözü paylaşır. */
function loadTurnstile(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile yüklenemedi"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export default function TurnstileWidget({
  onToken,
  lang = "tr",
}: {
  /** Token üretildiğinde çağrılır; süresi dolunca boş string ile çağrılır. */
  onToken: (token: string) => void;
  lang?: "tr" | "en";
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const id = useId();

  // onToken referansı her render'da değişebilir; effect'i yeniden çalıştırıp
  // widget'ı yeniden kurmasın diye ref'te tutulur. Ref güncellemesi render
  // sırasında değil, kendi effect'inde yapılır (react-hooks/refs).
  const cb = useRef(onToken);
  useEffect(() => {
    cb.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!siteKey || !ref.current) return;
    let cancelled = false;
    const el = ref.current;

    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile || widgetId.current) return;
        widgetId.current = window.turnstile.render(el, {
          sitekey: siteKey,
          callback: (token) => cb.current(token),
          "expired-callback": () => cb.current(""),
          "error-callback": () => cb.current(""),
          theme: "light",
          language: lang,
        });
      })
      .catch(() => cb.current(""));

    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [siteKey, lang]);

  if (!siteKey) return null;
  return <div ref={ref} id={id} className="mt-3" />;
}
