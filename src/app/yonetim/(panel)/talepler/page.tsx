import Link from "next/link";
import { Phone, Mail, ExternalLink } from "lucide-react";
import {
  getBookingRequests,
  getBookingCounts,
} from "@/lib/data/admin/bookings";
import {
  bookingStatusSchema,
  bookingStatusLabel,
  type BookingStatus,
} from "@/lib/schemas/adminBooking";
import BookingStatusSelect from "@/components/admin/BookingStatusSelect";
import { formatDateShort, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

const filters: { key: BookingStatus | "all"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "new", label: bookingStatusLabel.new },
  { key: "contacted", label: bookingStatusLabel.contacted },
  { key: "confirmed", label: bookingStatusLabel.confirmed },
  { key: "cancelled", label: bookingStatusLabel.cancelled },
];

export default async function TaleplerPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string }>;
}) {
  const { durum } = await searchParams;
  const parsed = bookingStatusSchema.safeParse(durum);
  const active: BookingStatus | undefined = parsed.success
    ? parsed.data
    : undefined;

  const [rows, counts] = await Promise.all([
    getBookingRequests(active),
    getBookingCounts(),
  ]);

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const countFor = (k: BookingStatus | "all") =>
    k === "all" ? total : (counts[k] ?? 0);

  return (
    <div>
      <h1 className="text-xl font-extrabold text-brand-950">Talepler</h1>
      <p className="mt-1 text-sm text-brand-900/55">
        Rezervasyon talepleri. Onaylayınca tarihler villa takviminde otomatik
        kapanır.
      </p>

      {/* Filtre sekmeleri */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => {
          const isActive =
            (f.key === "all" && !active) || f.key === active;
          const href =
            f.key === "all" ? "/yonetim/talepler" : `/yonetim/talepler?durum=${f.key}`;
          return (
            <Link
              key={f.key}
              href={href}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "bg-white text-brand-800 ring-1 ring-sand-200 hover:bg-sand-50"
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 text-xs ${
                  isActive ? "text-white/70" : "text-brand-900/40"
                }`}
              >
                {countFor(f.key)}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Liste */}
      {rows.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-sand-300 bg-white p-10 text-center text-sm text-brand-900/50">
          Bu filtrede talep yok.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-sand-200 bg-white">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_1fr_1.2fr_auto] gap-4 border-b border-sand-200 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-brand-900/40 lg:grid">
            <span>Villa / Tarih</span>
            <span>Misafir</span>
            <span>Tutar</span>
            <span>İletişim</span>
            <span>Talep tarihi</span>
            <span>Durum</span>
          </div>

          <ul className="divide-y divide-sand-100">
            {rows.map((r) => (
              <li
                key={r.id}
                className="grid grid-cols-1 gap-3 px-5 py-4 lg:grid-cols-[1.4fr_1fr_0.8fr_1fr_1.2fr_auto] lg:items-center lg:gap-4"
              >
                {/* Villa + tarih */}
                <div>
                  {r.villaSlug ? (
                    <Link
                      href={`/villa/${r.villaSlug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 font-semibold text-brand-900 hover:text-brand-700"
                    >
                      {r.villaName}
                      <ExternalLink className="h-3 w-3 opacity-50" />
                    </Link>
                  ) : (
                    <span className="font-semibold text-brand-900">
                      {r.villaName}
                    </span>
                  )}
                  <div className="text-sm text-brand-900/55">
                    {formatDateShort(r.checkIn)} – {formatDateShort(r.checkOut)}
                  </div>
                </div>

                {/* Misafir */}
                <div className="text-sm text-brand-900/70">
                  {r.adults + r.children} kişi
                  {r.babies > 0 && (
                    <span className="text-brand-900/40"> +{r.babies} bebek</span>
                  )}
                </div>

                {/* Tutar */}
                <div className="text-sm font-semibold text-brand-950">
                  {r.priceEstimate != null
                    ? formatPrice(r.priceEstimate)
                    : "—"}
                </div>

                {/* İletişim */}
                <div className="text-sm">
                  <div className="font-semibold text-brand-900">
                    {r.fullName}
                  </div>
                  <a
                    href={`tel:${r.phone.replace(/\s/g, "")}`}
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <Phone className="h-3 w-3" />
                    {r.phone}
                  </a>
                  {r.email && (
                    <a
                      href={`mailto:${r.email}`}
                      className="mt-0.5 flex items-center gap-1 text-brand-900/50 hover:underline"
                    >
                      <Mail className="h-3 w-3" />
                      {r.email}
                    </a>
                  )}
                </div>

                {/* Talep tarihi */}
                <div className="text-sm text-brand-900/55">
                  {formatDateShort(r.createdAt.slice(0, 10))}
                </div>

                {/* Durum */}
                <div className="lg:justify-self-end">
                  <BookingStatusSelect id={r.id} current={r.status} />
                </div>

                {r.note && (
                  <p className="rounded-lg bg-sand-50 px-3 py-2 text-sm text-brand-900/70 lg:col-span-6">
                    “{r.note}”
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
