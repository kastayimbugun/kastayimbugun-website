"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { createManualBooking } from "@/lib/actions/admin/bookings";
import { calcPrice } from "@/lib/pricing";
import { rangeHasConflict } from "@/lib/availability";
import { nightsBetween, formatDateShort, businessToday } from "@/lib/format";
import AvailabilityCalendar from "@/components/AvailabilityCalendar";
import { Field, Section } from "@/components/admin/ui/FormField";
import SaveBar from "@/components/admin/ui/SaveBar";
import { useToast } from "@/components/admin/ui/Toast";
import { useUnsavedGuard } from "@/components/admin/ui/useUnsavedGuard";
import { inputCls, errorCls, labelCls } from "@/components/admin/ui/styles";
import type { VillaPricingOption } from "@/lib/data/admin/villas";

const empty = {
  villaId: "",
  checkIn: "",
  checkOut: "",
  adults: "2",
  children: "0",
  babies: "0",
  fullName: "",
  phone: "",
  email: "",
  priceEstimate: "",
  paidAmount: "0",
  damageDeposit: "0",
  note: "",
};

type FormState = typeof empty;

export default function ManualBookingForm({
  villas,
}: {
  villas: VillaPricingOption[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [f, setF] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Fiyat önerisini kullanıcı elle değiştirdiyse bir daha üstüne yazma.
  const [priceTouched, setPriceTouched] = useState(false);

  const dirty = useMemo(() => JSON.stringify(f) !== JSON.stringify(empty), [f]);
  useUnsavedGuard(dirty);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setErrors((p) => (k in p ? { ...p, [k]: "" } : p));
  };

  const villa = villas.find((v) => v.id === f.villaId) ?? null;
  const nights =
    f.checkIn && f.checkOut ? nightsBetween(f.checkIn, f.checkOut) : 0;

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

  // Kullanıcı fiyata hiç dokunmadıysa alanda önerilen tutar görünür (salt
  // gösterim değil — gönderilirken de bu değer kullanılır, "Toplam tutar"
  // boş kalıp 0 olarak gitmesin diye). Dokunduğu an kendi yazdığı değer geçerli
  // olur; villa/tarih tekrar değişirse öneri güncellenir.
  const effectivePrice =
    !priceTouched && suggested != null ? String(suggested) : f.priceEstimate;

  const useSuggested = () => {
    if (suggested != null) {
      set("priceEstimate", String(suggested));
      setPriceTouched(true);
    }
  };

  const guestTotal = Number(f.adults || 0) + Number(f.children || 0);

  // Sitedeki ve panel takvimindeki (BlockEditor) aralık seçim mantığının aynısı:
  // ilk tık girişi, ikinci tık çıkışı belirler; dolu bir günle çakışırsa yeniden
  // giriş seçimine döner.
  const onDayClick = (iso: string) => {
    if (!villa) return;
    // Tarih aralığı her değiştiğinde tutar önerisi yeniden devreye girsin —
    // "Öner"e tekrar basmaya gerek kalmasın. Kullanıcı SONRASINDA elle bir
    // tutar yazarsa (ör. pazarlıklı fiyat) yalnızca o anki aralık için geçerli
    // olur; başka bir aralık seçildiğinde öneri yine baştan hesaplanır.
    setPriceTouched(false);
    if (!f.checkIn || (f.checkIn && f.checkOut)) {
      setF((p) => ({ ...p, checkIn: iso, checkOut: "" }));
      return;
    }
    if (iso <= f.checkIn) {
      setF((p) => ({ ...p, checkIn: iso, checkOut: "" }));
      return;
    }
    if (rangeHasConflict(f.checkIn, iso, villa.bookedRanges)) {
      setF((p) => ({ ...p, checkIn: iso, checkOut: "" }));
      return;
    }
    setF((p) => ({ ...p, checkOut: iso }));
    setErrors((p) => ({ ...p, checkIn: "", checkOut: "" }));
  };

  const submit = () => {
    setErrors({});
    start(async () => {
      const res = await createManualBooking({ ...f, priceEstimate: effectivePrice });
      if (res.ok) {
        toast.success("Rezervasyon oluşturuldu, takvim kapandı.");
        router.push("/yonetim/rezervasyonlar");
        return;
      }
      if (res.fields && Object.keys(res.fields).length > 0) {
        setErrors(res.fields);
        toast.error("Bazı alanlar eksik veya hatalı — işaretli yerlere bakın.");
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : res.error === "conflict"
              ? "Bu tarihler zaten dolu — takvimde çakışma var."
              : res.error === "orphan"
                ? "Rezervasyon oluştu ancak takvim kapatılamadı ve geri alınamadı. Rezervasyonlar listesinden bu kaydı bulup iptal edin, sonra tekrar deneyin."
                : "Oluşturulamadı."
        );
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onKeyDown={(e) => {
        // Bir metin/sayı alanında Enter'a basınca form kendiliğinden
        // gönderilmesin — kayıt yalnızca "Rezervasyon Oluştur" butonuyla oluşsun.
        // Textarea (not alanı) hariç: orada Enter satır atlamaya devam eder.
        const el = e.target as HTMLElement;
        if (e.key === "Enter" && el.tagName !== "TEXTAREA") {
          e.preventDefault();
        }
      }}
      className="space-y-5"
    >
      <Section title="Villa">
        <Field label="Villa" required error={errors.villaId}>
          <select
            className={inputCls}
            value={f.villaId}
            onChange={(e) => {
              // Villa değişince eski seçim başka villanın müsaitliğine göre
              // anlamsız kalır — tarihleri sıfırla.
              setF((p) => ({
                ...p,
                villaId: e.target.value,
                checkIn: "",
                checkOut: "",
              }));
              setErrors((p) => ({ ...p, villaId: "", checkIn: "", checkOut: "" }));
              setPriceTouched(false);
            }}
          >
            <option value="">Seçin…</option>
            {villas.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.regionName && ` — ${v.regionName}`}
              </option>
            ))}
          </select>
          {villa && (
            <p className="mt-1 text-[11px] leading-snug text-brand-900/70">
              Kapasite {villa.capacity} kişi · min. {villa.minNights} gece
            </p>
          )}
        </Field>
      </Section>

      <Section
        title="Tarih"
        description={
          villa
            ? "Takvimden giriş gününe, ardından çıkış gününe tıklayın. Dolu bir günün üstüne gelince kimin kaldığını görürsünüz."
            : undefined
        }
      >
        {villa ? (
          <div>
            <div className="mb-3 flex justify-end">
              <Link
                href={`/yonetim/rezervasyonlar?villa=${villa.id}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
              >
                Bu villanın tüm rezervasyonlarını gör
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <AvailabilityCalendar
              bookedRanges={villa.bookedRanges}
              seasons={villa.seasons}
              checkIn={f.checkIn || null}
              checkOut={f.checkOut || null}
              onDayClick={onDayClick}
              getBookedNote={(iso) =>
                villa.bookedRanges.find((b) => iso >= b.start && iso < b.end)
                  ?.note ?? null
              }
            />
            <p className="mt-3 text-sm">
              {f.checkIn && f.checkOut ? (
                <span className="font-semibold text-brand-950">
                  {formatDateShort(f.checkIn)} – {formatDateShort(f.checkOut)}
                  <span className="ml-1 font-normal text-brand-900/70">
                    · {nights} gece
                  </span>
                </span>
              ) : f.checkIn ? (
                <span className="text-brand-900/70">
                  Çıkış tarihini seçin ({formatDateShort(f.checkIn)} →)
                </span>
              ) : (
                <span className="text-brand-900/70">
                  Henüz tarih seçilmedi.
                </span>
              )}
            </p>
            {(errors.checkIn || errors.checkOut) && (
              <p className={errorCls}>{errors.checkIn || errors.checkOut}</p>
            )}
          </div>
        ) : (
          <p className={labelCls}>
            Müsaitlik takvimini görmek için önce villa seçin.
          </p>
        )}
      </Section>

      <Section title="Misafir">
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
        {villa && guestTotal > villa.capacity && (
          <p className="mt-2 text-xs font-semibold text-sun-700">
            Bu villanın kapasitesi {villa.capacity} kişi — {guestTotal} kişi
            girdiniz.
          </p>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
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
              placeholder="05xx xxx xx xx"
            />
          </Field>
          <Field label="E-posta" error={errors.email} hint="Opsiyonel.">
            <input
              type="email"
              className={inputCls}
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section
        title="Ödeme"
        description="Villa fiyatına göre bir tutar öneriliyor; pazarlıkla değiştiyse elle düzeltin."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Field
            label="Toplam tutar (₺)"
            required
            error={errors.priceEstimate}
            hint={
              // Alan zaten önerilen tutarı gösteriyor; ipucu yalnızca kullanıcı
              // bunu ELLE değiştirdiyse ve geri dönmek isteyebileceği zaman anlamlı.
              priceTouched && suggested != null
                ? `Villa fiyatına göre önerilen: ${suggested.toLocaleString("tr-TR")} ₺`
                : undefined
            }
          >
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                className={inputCls}
                value={effectivePrice}
                onChange={(e) => {
                  set("priceEstimate", e.target.value);
                  setPriceTouched(true);
                }}
              />
              {priceTouched && suggested != null && (
                <button
                  type="button"
                  onClick={useSuggested}
                  className="shrink-0 rounded-lg border border-sand-200 px-3 text-xs font-semibold text-brand-700 transition hover:bg-sand-50"
                >
                  Öner
                </button>
              )}
            </div>
          </Field>
          <Field label="Ödenen tutar (₺)" error={errors.paidAmount}>
            <input
              type="number"
              min={0}
              className={inputCls}
              value={f.paidAmount}
              onChange={(e) => set("paidAmount", e.target.value)}
            />
          </Field>
          <Field
            label="Hasar depozitosu (₺)"
            error={errors.damageDeposit}
            hint="Çıkışta iade edilir."
          >
            <input
              type="number"
              min={0}
              className={inputCls}
              value={f.damageDeposit}
              onChange={(e) => set("damageDeposit", e.target.value)}
            />
          </Field>
        </div>
      </Section>

      <Section title="Not">
        <Field label="Not" error={errors.note} hint="Yalnızca panelde görünür.">
          <textarea
            rows={3}
            className={inputCls}
            value={f.note}
            onChange={(e) => set("note", e.target.value)}
          />
        </Field>
      </Section>

      <SaveBar pending={pending} dirty={dirty} label="Rezervasyon Oluştur" />
    </form>
  );
}
