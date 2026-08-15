import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Phone,
  MessageCircle,
  FileText,
  CalendarDays,
  ExternalLink,
} from "lucide-react";
import { getBookingDetail } from "@/lib/data/admin/bookings";
import { getVillaPricingOptions } from "@/lib/data/admin/villas";
import { lostReasonLabel } from "@/lib/schemas/adminBooking";
import { formatDateTime } from "@/lib/format";
import { formatDuration, responseMinutes } from "@/lib/bookingWaiting";
import BookingDetailForm from "@/components/admin/BookingDetailForm";
import BookingNotes from "@/components/admin/BookingNotes";
import BookingStatusSelect from "@/components/admin/BookingStatusSelect";
import DeleteBookingButton from "@/components/admin/DeleteBookingButton";
import { BackLink } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

/** wa.me yalnızca rakam kabul eder. */
function waLink(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const full = digits.startsWith("0") ? `9${digits}` : digits;
  return `https://wa.me/${full}`;
}

const actionCls =
  "inline-flex items-center gap-1.5 rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm font-semibold text-brand-800 transition hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-brand-300";

export default async function TalepDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, villas] = await Promise.all([
    getBookingDetail(id),
    getVillaPricingOptions(),
  ]);
  if (!booking) notFound();

  const responded = responseMinutes(booking.createdAt, booking.firstResponseAt);

  return (
    <div>
      <BackLink href="/yonetim/talepler">Talepler</BackLink>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-brand-950">
            {booking.fullName}
          </h1>
          <p className="text-sm text-brand-900/70">
            {booking.villaName} · {booking.nights} gece · talep{" "}
            {formatDateTime(booking.createdAt)}
          </p>
          {responded != null && (
            <p className="mt-0.5 text-sm text-brand-900/70">
              İlk yanıt: {formatDuration(responded)} sonra
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {booking.status === "lost" && booking.lostReason && (
            <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-bold text-brand-900/70">
              {lostReasonLabel[booking.lostReason]}
            </span>
          )}
          <BookingStatusSelect id={booking.id} current={booking.status} />
        </div>
      </div>

      {/* Hızlı eylemler — telefonla satışta en çok kullanılanlar önde */}
      <div className="mt-4 flex flex-wrap gap-2">
        <a href={`tel:${booking.phone}`} className={actionCls}>
          <Phone className="h-4 w-4" />
          Ara
        </a>
        <a
          href={waLink(booking.phone)}
          target="_blank"
          rel="noopener noreferrer"
          className={actionCls}
        >
          <MessageCircle className="h-4 w-4" />
          WhatsApp
        </a>
        <Link href={`/yonetim/talepler/${booking.id}/konfirmasyon`} className={actionCls}>
          <FileText className="h-4 w-4" />
          Konfirmasyon
        </Link>
        {booking.villaId && (
          <Link href={`/yonetim/villalar/${booking.villaId}`} className={actionCls}>
            <CalendarDays className="h-4 w-4" />
            Takvime bak
          </Link>
        )}
        {booking.villaSlug && (
          <a
            href={`/villa/${booking.villaSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className={actionCls}
          >
            <ExternalLink className="h-4 w-4" />
            Villa sayfası
          </a>
        )}
        <DeleteBookingButton
          bookingId={booking.id}
          guestName={booking.fullName}
          villaName={booking.villaName}
          isConfirmed={booking.status === "confirmed"}
          redirectTo={booking.status === "confirmed" ? "/yonetim/rezervasyonlar" : "/yonetim/talepler"}
        />
      </div>

      <div className="mt-5">
        <BookingDetailForm booking={booking} villas={villas} />
      </div>

      <div className="mt-5">
        <BookingNotes
          bookingId={booking.id}
          notes={booking.notes}
          nextFollowUpAt={booking.nextFollowUpAt}
        />
      </div>
    </div>
  );
}
