"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Phone,
  Mail,
  ExternalLink,
  MessageCircle,
  CalendarDays,
  FileText,
  Pencil,
  Loader2,
} from "lucide-react";
import { updateBookingPayment } from "@/lib/actions/admin/bookings";
import { useToast } from "@/components/admin/ui/Toast";
import { Field } from "@/components/admin/ui/FormField";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import BookingStatusSelect from "@/components/admin/BookingStatusSelect";
import { inputCls, btnPrimary, btnSecondary } from "@/components/admin/ui/styles";
import { formatDateShort, formatDateTime, formatPrice } from "@/lib/format";
import { waitingBadge } from "@/lib/bookingWaiting";
import type { AdminBooking } from "@/lib/data/admin/bookings";

/** Telefonu wa.me biçimine çevirir (TR varsayımı). */
function waHref(phone: string): string {
  const d = phone.replace(/\D/g, "");
  const intl = d.startsWith("90")
    ? d
    : d.startsWith("0")
      ? `90${d.slice(1)}`
      : d.length === 10
        ? `90${d}`
        : d;
  return `https://wa.me/${intl}`;
}

export default function BookingRow({ booking: r }: { booking: AdminBooking }) {
  const router = useRouter();
  const toast = useToast();
  const [editingPayment, setEditingPayment] = useState(false);
  const [pending, start] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    paidAmount: String(r.paidAmount),
    damageDeposit: String(r.damageDeposit),
    depositNote: r.depositNote ?? "",
  });

  const w = r.status === "new" ? waitingBadge(r.createdAt) : null;
  const remaining =
    r.priceEstimate != null ? Math.max(0, r.priceEstimate - r.paidAmount) : null;

  const savePayment = () => {
    setErrors({});
    start(async () => {
      const res = await updateBookingPayment({
        id: r.id,
        paidAmount: form.paidAmount,
        damageDeposit: form.damageDeposit,
        depositNote: form.depositNote,
      });
      if (res.ok) {
        toast.success("Ödeme bilgisi kaydedildi.");
        setEditingPayment(false);
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
            : "Kaydedilemedi."
        );
      }
    });
  };

  return (
    <li className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr_1.2fr_1fr_auto] lg:items-start lg:gap-4">
      {/* Villa + tarih */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          {r.villaId ? (
            <Link
              href={`/yonetim/villalar/${r.villaId}`}
              className="font-semibold text-brand-900 hover:text-brand-700 hover:underline"
            >
              {r.villaName}
            </Link>
          ) : (
            <span className="font-semibold text-brand-900">{r.villaName}</span>
          )}
          {r.villaSlug && (
            <Link
              href={`/villa/${r.villaSlug}`}
              target="_blank"
              aria-label={`${r.villaName} — sitede aç`}
              className="text-brand-900/60 hover:text-brand-700"
            >
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
        <div className="text-sm text-brand-900/70">
          {formatDateShort(r.checkIn)} – {formatDateShort(r.checkOut)} ·{" "}
          {r.nights} gece
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <Link
            href={`/yonetim/talepler/${r.id}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            <Pencil className="h-3 w-3" />
            Detay / düzenle
          </Link>
          {r.villaId && (
            <Link
              href={`/yonetim/villalar/${r.villaId}`}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
            >
              <CalendarDays className="h-3 w-3" />
              Takvime bak
            </Link>
          )}
          <Link
            href={`/yonetim/talepler/${r.id}/konfirmasyon`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline"
          >
            <FileText className="h-3 w-3" />
            Konfirmasyon
          </Link>
        </div>
      </div>

      {/* Misafir */}
      <div className="text-sm text-brand-900/70">
        {r.adults + r.children} kişi
        {r.babies > 0 && <span> +{r.babies} bebek</span>}
      </div>

      {/* Tutar + ödeme özeti */}
      <div>
        <div className="text-sm font-semibold text-brand-950">
          {r.priceEstimate != null ? formatPrice(r.priceEstimate) : "—"}
        </div>
        {r.priceEstimate != null && (
          <button
            type="button"
            onClick={() => setEditingPayment((v) => !v)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            <Pencil className="h-3 w-3" />
            {r.paidAmount > 0 ? (
              <>Ödenen {formatPrice(r.paidAmount)}</>
            ) : (
              <>Ödeme kaydet</>
            )}
          </button>
        )}
        {remaining != null && remaining > 0 && r.paidAmount > 0 && (
          <div className="text-[11px] text-brand-900/70">
            Kalan {formatPrice(remaining)}
          </div>
        )}
      </div>

      {/* İletişim */}
      <div className="text-sm">
        <div className="font-semibold text-brand-900">{r.fullName}</div>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <a
            href={`tel:${r.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-800 transition hover:bg-brand-100"
          >
            <Phone className="h-3 w-3" />
            Ara
          </a>
          <a
            href={waHref(r.phone)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
          >
            <MessageCircle className="h-3 w-3" />
            WhatsApp
          </a>
        </div>
        <div className="mt-1 text-xs text-brand-900/70">{r.phone}</div>
        {r.email && (
          <a
            href={`mailto:${r.email}`}
            className="mt-0.5 flex items-center gap-1 text-xs text-brand-900/70 hover:underline"
          >
            <Mail className="h-3 w-3" />
            {r.email}
          </a>
        )}
      </div>

      {/* Talep tarihi + bekleme süresi */}
      <div className="text-sm text-brand-900/70">
        {formatDateTime(r.createdAt)}
        {w && (
          <div className="mt-1">
            <StatusBadge tone={w.tone}>{w.label}</StatusBadge>
          </div>
        )}
      </div>

      {/* Durum */}
      <div className="lg:justify-self-end">
        <BookingStatusSelect id={r.id} current={r.status} />
      </div>

      {/* Ödeme düzenleme — açıksa tam genişlikte yeni satıra düşer */}
      {editingPayment && (
        <div className="rounded-xl border border-dashed border-sand-300 bg-sand-50 p-3 lg:col-span-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Ödenen tutar (₺)" error={errors.paidAmount}>
              <input
                type="number"
                min={0}
                className={inputCls}
                value={form.paidAmount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paidAmount: e.target.value }))
                }
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
                value={form.damageDeposit}
                onChange={(e) =>
                  setForm((f) => ({ ...f, damageDeposit: e.target.value }))
                }
              />
            </Field>
            <Field
              label="Not"
              error={errors.depositNote}
              hint="Ör. dekont WhatsApp'ta."
            >
              <input
                className={inputCls}
                value={form.depositNote}
                onChange={(e) =>
                  setForm((f) => ({ ...f, depositNote: e.target.value }))
                }
              />
            </Field>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditingPayment(false)}
              className={btnSecondary}
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={savePayment}
              disabled={pending}
              className={btnPrimary}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Kaydet
            </button>
          </div>
        </div>
      )}

      {r.note && (
        <p className="rounded-lg bg-sand-50 px-3 py-2 text-sm text-brand-900/70 lg:col-span-6">
          “{r.note}”
        </p>
      )}
    </li>
  );
}
