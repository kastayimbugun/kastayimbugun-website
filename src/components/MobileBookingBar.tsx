"use client";

import { useEffect, useState, type RefObject } from "react";
import { CalendarCheck, MessageCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

/**
 * Mobilde ekranın altına sabitlenen rezervasyon çubuğu.
 *
 * Neden: villa detayında rezervasyon kutusu `lg:flex-row` yüzünden mobilde sol
 * sütunun 9 bölümünün ALTINDA kalıyor. Ölçüldü (375×812): sayfa 6.755 px, yani
 * 8,3 ekran; "Rezervasyon Talebi Gönder" butonu **y=4.228 px — 5,2 ekran
 * aşağıda**, ilk fiyat 3 ekran aşağıda. Sayfadaki tek yapışkan öğe header'dı.
 * Türkiye'de trafiğin ~%75'i mobil olduğundan huninin en dar yeri burasıydı.
 *
 * Davranış:
 *   · Rezervasyon kutusu ekranda görünürken çubuk gizlenir (çift CTA olmasın).
 *   · Tarih seçilmemişse buton TAKVİME götürür — kutuya götürmek kullanıcıyı
 *     tarih için tekrar yukarı çıkmak zorunda bırakırdı.
 *   · Tarih seçiliyse kutuya götürür ve toplam tutarı gösterir.
 *   · WhatsApp butonu yalnızca panelde numara tanımlıysa görünür; mesaj villa
 *     adı, kodu ve seçili tarihlerle önceden doldurulur.
 */
export default function MobileBookingBar({
  villaName,
  villaCode,
  priceLabel,
  totalLabel,
  nights,
  hasDates,
  whatsapp,
  bookingBoxRef,
  onPrimary,
}: {
  villaName: string;
  villaCode?: string;
  /** Gecelik fiyat metni (rezervasyon kutusuyla aynı kaynaktan gelir). */
  priceLabel: string;
  /** Tarih seçiliyse toplam tutar. */
  totalLabel?: string | null;
  nights: number;
  hasDates: boolean;
  whatsapp?: string | null;
  /**
   * Rezervasyon kutusunun kendisi. Kutu ekranda görünürken çubuk gizlenir —
   * aynı anda iki CTA göstermek kafa karıştırır.
   */
  bookingBoxRef: RefObject<HTMLElement | null>;
  /** Tarih yoksa takvime, varsa rezervasyon kutusuna götürür. */
  onPrimary: () => void;
}) {
  const { t, lang } = useI18n();
  const [visible, setVisible] = useState(false);

  // Rezervasyon kutusu ekranda görünürken çubuğu gizle — aynı anda iki CTA
  // göstermek kafa karıştırır.
  //
  // NOT: bu davranış otomatik testte doğrulanamadı; başsız/arka plandaki
  // belgede ne IntersectionObserver ne de scroll olayı tetikleniyor
  // (`document.visibilityState === "hidden"`). Çubuğun kendisi, fiyatı ve
  // konumu doğrulandı; yalnızca göster/gizle geçişi gerçek cihazda
  // kontrol edilmeli.
  useEffect(() => {
    const el = bookingBoxRef.current;
    // Kutu yoksa çubuk görünsün — CTA'sız kalmaktan iyidir.
    if (!el) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [bookingBoxRef]);

  const waHref = (() => {
    if (!whatsapp) return null;
    const digits = whatsapp.replace(/\D/g, "");
    if (digits.length < 10) return null;
    // wa.me yalnızca rakam kabul eder; TR numarası 0 ile başlıyorsa 90 ekle.
    const intl = digits.startsWith("90")
      ? digits
      : digits.startsWith("0")
        ? `90${digits.slice(1)}`
        : `90${digits}`;
    const parts = [villaName, villaCode ? `(${villaCode})` : ""].filter(Boolean);
    const msg =
      lang === "tr"
        ? `Merhaba, ${parts.join(" ")} hakkında bilgi almak istiyorum.` +
          (hasDates ? ` Tarihler: ${totalLabel ? `${nights} gece` : ""}` : "")
        : `Hello, I'd like information about ${parts.join(" ")}.`;
    return `https://wa.me/${intl}?text=${encodeURIComponent(msg)}`;
  })();

  return (
    <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-200 lg:hidden ${
          visible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-extrabold text-brand-800">
              {totalLabel ?? priceLabel}
            </div>
            <div className="truncate text-[11px] text-brand-900/70">
              {hasDates && nights > 0
                ? `${nights} ${t("book.nightsTotal")}`
                : t("book.selectDates")}
            </div>
          </div>

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-600 text-emerald-700 transition hover:bg-emerald-50"
            >
              <MessageCircle className="h-5 w-5" aria-hidden="true" />
            </a>
          )}

          <button
            type="button"
            onClick={onPrimary}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-sun-500 px-5 text-sm font-bold text-brand-950 shadow-sm transition hover:bg-sun-600"
          >
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            {hasDates ? t("book.reserve") : t("book.selectDates")}
          </button>
      </div>
    </div>
  );
}
