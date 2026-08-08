"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, MessageSquarePlus } from "lucide-react";
import { addBookingNote } from "@/lib/actions/admin/bookings";
import { formatDateTime } from "@/lib/format";
import { Field } from "@/components/admin/ui/FormField";
import { useToast } from "@/components/admin/ui/Toast";
import { inputCls } from "@/components/admin/ui/styles";
import type { BookingNote } from "@/lib/data/admin/bookings";

/**
 * Arama notu geçmişi (yol haritası 2.2).
 *
 * Online ödeme olmadığı için satışın tamamı telefonda geçiyor; "kiminle ne
 * konuşuldu" kaydı olmayınca personel değişiminde bilgi tamamen kayboluyordu.
 * Notlar silinmez — geçmişin bütünlüğü korunur (docs/panel-kurallari.md §3).
 */

/** ISO damgayı `datetime-local` alanının beklediği biçime çevirir (UTC+3). */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const shifted = new Date(new Date(iso).getTime() + 3 * 3600_000);
  return shifted.toISOString().slice(0, 16);
}

export default function BookingNotes({
  bookingId,
  notes,
  nextFollowUpAt,
}: {
  bookingId: string;
  notes: BookingNote[];
  nextFollowUpAt: string | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [body, setBody] = useState("");
  const [followUp, setFollowUp] = useState(() => toLocalInput(nextFollowUpAt));
  const [error, setError] = useState("");

  const submit = () => {
    setError("");
    start(async () => {
      const res = await addBookingNote({ bookingId, body, followUpAt: followUp });
      if (res.ok) {
        setBody("");
        toast.success("Not eklendi.");
        router.refresh();
        return;
      }

      if (res.fields?.body) {
        setError(res.fields.body);
      } else {
        toast.error(
          res.error === "auth"
            ? "Oturumunuz sona ermiş. Yeniden giriş yapın."
            : "Not eklenemedi."
        );
      }
    });
  };

  const followUpDue =
    nextFollowUpAt != null && new Date(nextFollowUpAt) <= new Date();

  return (
    <div className="rounded-2xl border border-sand-200 bg-white p-5">
      <h2 className="text-sm font-bold text-brand-950">Görüşme notları</h2>
      <p className="mt-1 text-sm text-brand-900/70">
        Her aramadan sonra kısa bir not bırakın — &ldquo;14:20 aradım,
        meşguldü&rdquo; gibi. Notlar silinmez.
      </p>

      {nextFollowUpAt && (
        <p
          className={`mt-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
            followUpDue
              ? "bg-rose-50 text-rose-800"
              : "bg-sky-50 text-sky-800"
          }`}
        >
          <CalendarClock className="h-4 w-4" />
          {followUpDue ? "Takip zamanı geldi:" : "Sonraki takip:"}{" "}
          {formatDateTime(nextFollowUpAt)}
        </p>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="mt-4 space-y-3"
      >
        <Field label="Yeni not" error={error}>
          <textarea
            value={body}
            onChange={(e) => {
              setBody(e.target.value);
              setError("");
            }}
            placeholder="Ör. 15:00 fiyat WhatsApp'tan gönderildi, düşünüp dönecek."
            className={`${inputCls} min-h-20 resize-y`}
          />
        </Field>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field
            label="Sonraki takip"
            hint="Boş bırakılırsa takip hatırlatması kaldırılır."
            className="w-full sm:max-w-xs"
          >
            <input
              type="datetime-local"
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              className={inputCls}
            />
          </Field>

          <button
            type="submit"
            disabled={pending || body.trim() === ""}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-800 focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <MessageSquarePlus className="h-4 w-4" />
            Not ekle
          </button>
        </div>
      </form>

      {notes.length > 0 && (
        <ul className="mt-5 space-y-3 border-t border-sand-100 pt-4">
          {notes.map((n) => (
            <li key={n.id} className="text-sm">
              <div className="flex flex-wrap items-baseline gap-x-2 text-xs text-brand-900/70">
                <span className="font-semibold text-brand-900">
                  {n.authorName ?? "Personel"}
                </span>
                <span>{formatDateTime(n.createdAt)}</span>
              </div>
              <p className="mt-0.5 whitespace-pre-wrap text-brand-950">
                {n.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
