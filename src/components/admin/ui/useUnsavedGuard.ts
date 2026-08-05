"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./ConfirmDialog";

/**
 * Kaydedilmemiş değişiklik uyarısı (docs/panel-kurallari.md §4).
 *
 * Bundan önce 47 alanlı villa formunu doldurup sol menüden başka bir sayfaya
 * tıklamak, girilen her şeyi uyarısız siliyordu.
 *
 * İki yolu birden kapatır:
 *  1. Sekme kapatma / yenileme → tarayıcının `beforeunload` uyarısı.
 *  2. Panel içi gezinme (menü, "Geri" linki) → yakalama fazında tıklama
 *     dinleyicisi; onay verilirse gezinme elle sürdürülür.
 */
export function useUnsavedGuard(dirty: boolean) {
  const confirm = useConfirm();
  const router = useRouter();

  useEffect(() => {
    if (!dirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const onClick = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || anchor.target === "_blank") return;
      // Dış bağlantıları yönlendirme; yalnızca panel içi gezinmeyi koru.
      if (/^https?:\/\//i.test(href)) return;

      e.preventDefault();
      e.stopPropagation();
      void (async () => {
        const leave = await confirm({
          title: "Kaydedilmemiş değişiklikler var",
          body: "Bu sayfadan çıkarsanız yaptığınız değişiklikler kaybolur.",
          confirmLabel: "Çık, kaydetme",
          cancelLabel: "Sayfada kal",
          tone: "danger",
        });
        if (leave) router.push(href);
      })();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty, confirm, router]);
}
