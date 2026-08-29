"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateBooking } from "@/lib/actions/admin/bookings";
import { calcPrice } from "@/lib/pricing";
import { nightsBetween, formatPrice, businessToday } from "@/lib/format";
import { Field, Section } from "@/components/admin/ui/FormField";
import SaveBar from "@/components/admin/ui/SaveBar";
import { useToast } from "@/components/admin/ui/Toast";
import { useConfirm } from "@/components/admin/ui/ConfirmDialog";
import { useUnsavedGuard } from "@/components/admin/ui/useUnsavedGuard";
import { inputCls } from "@/components/admin/ui/styles";
import type { AdminBookingDetail } from "@/lib/data/admin/bookings";
import type { VillaPricingOption } from "@/lib/data/admin/villas";

type FormState = {
  villaId: string;
  checkIn: string;
  checkOut: string;
  adults: string;
  children: string;
  babies: string;
  fullName: string;
  phone: string;
  email: string;
  priceEstimate: string;
  paidAmount: string;
  damageDeposit: string;
  depositNote: string;
  note: string;
};

function fromBooking(b: AdminBookingDetail): FormState {
  return {
    villaId: b.villaId ?? "",
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    adults: String(b.adults),
    children: String(b.children),
    babies: String(b.babies),
    fullName: b.fullName,
    phone: b.phone,
    email: b.email ?? "",
    priceEstimate: b.priceEstimate != null ? String(b.priceEstimate) : "0",
    paidAmount: String(b.paidAmount),
    damageDeposit: String(b.damageDeposit),
    depositNote: b.depositNote ?? "",
    note: b.note ?? "",
  };
}

/**
 * Talep/rezervasyon detayının düzenlenebilir hâli.
 *
 * Onaylı bir kaydın villası veya tarihi değişirse takvimdeki blok da taşınır
 * (sunucuda, `updateBooking`). Kullanıcı bunu bilerek yapsın diye kaydetmeden
 * önce açıkça uyarılıyor — yanlış tıklama çift rezervasyona kadar gidebilir.
 */
export default function BookingDetailForm({
  booking,
  villas,
}: {
  booking: AdminBookingDetail;
  villas: VillaPricingOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, start] = useTransition();

  const [saved, setSaved] = useState<FormState>(() => fromBooking(booking));
  const [f, setF] = useState<FormState>(() => fromBooking(booking));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const dirty = useMemo(
    () => JSON.stringify(f) !== JSON.stringify(saved),
    [f, saved]
  );
  useUnsavedGuard(dirty);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const villa = villas.find((v) => v.id === f.villaId) ?? null;
  const nights =
    f.checkIn && f.checkOut ? nightsBetween(f.checkIn, f.checkOut) : 0;

  // Villa/tarih değiştiğinde güncel tutar ne olurdu? Karar kullanıcıda:
  // pazarlıklı fiyatlar sık, bu yüzden otomatik üstüne yazılmıyor.
  const suggested =
    villa && nights > 0
      ? calcPrice(
          // `villa` (VillaPricingOption) fiyat kurallarini da tasiyor; nesneyi
          // elle daraltmak hafta sonu primi / LOS indirimi / son dakika / kapasite
          // ustu ucreti sessizce dusuruyordu — panel ile site farkli tutar veriyordu.
          villa,
          f.checkIn,
          f.checkOut,
          {
            guests: (Number(f.adults) || 0) + (Number(f.children) || 0),
            asOf: businessToday(),
          }
        ).total
      : null;

  const movesCalendar =
    booking.status === "confirmed" &&
    (f.villaId !== (booking.villaId ?? "") ||
      f.checkIn !== booking.checkIn ||
      f.checkOut !== booking.checkOut);

  const submit = async () => {
    if (movesCalendar) {
      const ok = await confirm({
        title: "Takvim kaydı taşınsın mı?",
        body: "Bu onaylı bir rezervasyon. Villa veya tarih değiştiği için villa takvimindeki kapalı aralık da taşınacak: eski tarihler siteye yeniden açılacak, yeni tarihler kapanacak. Yeni tarihler doluysa değişiklik kaydedilmez.",
        confirmLabel: "Evet, taşı",
        tone: "danger",
      });
      if (!ok) return;
    }

    setErrors({});
    start(async () => {
      const res = await updateBooking({ id: booking.id, ...f });
      if (res.ok) {
        setSaved(f);
        toast.success("Kaydedildi.");
        router.refresh();
        return;
      }

      if (res.fields && Object.keys(res.fields).length > 0) {
        setErrors(res.fields);
        toast.error("Bazı alanlar eksik veya hatalı — işaretli yerlere bakın.");
      } else {
        toast.error(
          res.error === "conflict"
            ? "Yeni tarihler bu villada dolu — kayıt değiştirilmedi."
            : res.error === "auth"
              ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
              : "Kaydedilemedi."
        );
      }
    });
  };

  const remaining =
    Number(f.priceEstimate || 0) - Number(f.paidAmount || 0);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
      className="space-y-5"
    >
      <Section title="Konaklama">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Villa" required error={errors.villaId}>
            <select
              className={inputCls}
              value={f.villaId}
              onChange={(e) => set("villaId", e.target.value)}
            >
              <option value="">Villa seçin…</option>
              {villas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Gece sayısı"
            hint={nights > 0 ? undefined : "Tarihleri seçince hesaplanır"}
          >
            <input
              className={`${inputCls} bg-sand-50`}
              value={nights > 0 ? `${nights} gece` : "—"}
              readOnly
            />
          </Field>

          <Field label="Giriş tarihi" required error={errors.checkIn}>
            <input
              type="date"
              className={inputCls}
              value={f.checkIn}
              onChange={(e) => set("checkIn", e.target.value)}
            />
          </Field>

          <Field label="Çıkış tarihi" required error={errors.checkOut}>
            <input
              type="date"
              className={inputCls}
              value={f.checkOut}
              onChange={(e) => set("checkOut", e.target.value)}
            />
          </Field>
        </div>

        {movesCalendar && (
          <p className="mt-3 rounded-lg bg-sun-50 px-3 py-2 text-sm text-sun-900">
            Bu onaylı bir rezervasyon. Kaydedince villa takvimindeki kapalı
            aralık yeni tarihlere taşınır.
          </p>
        )}
      </Section>

      <Section title="Kişi sayısı">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Yetişkin" required error={errors.adults}>
            <input
              type="number"
              min={1}
              className={inputCls}
              value={f.adults}
              onChange={(e) => set("adults", e.target.value)}
            />
          </Field>
          <Field label="Çocuk" error={errors.children}>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={f.children}
              onChange={(e) => set("children", e.target.value)}
            />
          </Field>
          <Field label="Bebek" error={errors.babies}>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={f.babies}
              onChange={(e) => set("babies", e.target.value)}
            />
          </Field>
        </div>
        {villa && Number(f.adults || 0) + Number(f.children || 0) > villa.capacity && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">
            Bu villanın kapasitesi {villa.capacity} kişi — girilen sayı üstünde.
          </p>
        )}
      </Section>

      <Section title="Misafir">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ad soyad" required error={errors.fullName}>
            <input
              className={inputCls}
              value={f.fullName}
              onChange={(e) => set("fullName", e.target.value)}
            />
          </Field>
          <Field label="Telefon" required error={errors.phone}>
            <input
              className={inputCls}
              value={f.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="E-posta" error={errors.email}>
            <input
              className={inputCls}
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field
            label="Talep notu"
            hint="Misafirin form doldururken yazdığı not."
            error={errors.note}
          >
            <textarea
              className={`${inputCls} min-h-20 resize-y`}
              value={f.note}
              onChange={(e) => set("note", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Tutar ve ödeme">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Toplam tutar"
            required
            error={errors.priceEstimate}
            hint={
              suggested != null && String(suggested) !== f.priceEstimate
                ? `Güncel sezon fiyatı: ${formatPrice(suggested)}`
                : undefined
            }
          >
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={f.priceEstimate}
                onChange={(e) => set("priceEstimate", e.target.value)}
              />
              {suggested != null && String(suggested) !== f.priceEstimate && (
                <button
                  type="button"
                  onClick={() => set("priceEstimate", String(suggested))}
                  className="shrink-0 rounded-lg border border-sand-200 px-3 text-sm font-semibold text-brand-800 transition hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                >
                  Uygula
                </button>
              )}
            </div>
          </Field>

          <Field label="Ödenen" error={errors.paidAmount}>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={f.paidAmount}
              onChange={(e) => set("paidAmount", e.target.value)}
            />
          </Field>

          <Field label="Hasar depozitosu" error={errors.damageDeposit}>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={f.damageDeposit}
              onChange={(e) => set("damageDeposit", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <span className="text-brand-900/70">
            Girişte kalan:{" "}
            <strong className="text-brand-950">
              {formatPrice(Math.max(0, remaining))}
            </strong>
          </span>
          {remaining < 0 && (
            <span className="font-semibold text-rose-700">
              Ödenen tutar toplamdan fazla.
            </span>
          )}
        </div>

        <div className="mt-4">
          <Field label="Ödeme notu" error={errors.depositNote}>
            <input
              className={inputCls}
              value={f.depositNote}
              placeholder="Ör. kapora banka havalesiyle alındı"
              onChange={(e) => set("depositNote", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <SaveBar pending={pending} dirty={dirty} label="Kaydet" />
    </form>
  );
}
