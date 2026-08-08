import Link from "next/link";
import { Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import {
  getBookingRequests,
  getBookingCounts,
  BOOKINGS_PAGE_SIZE,
  type BookingFilters,
} from "@/lib/data/admin/bookings";
import { getVillaOptions } from "@/lib/data/admin/villas";
import {
  bookingQuerySchema,
  bookingStatusLabel,
  type BookingStatus,
} from "@/lib/schemas/adminBooking";
import BookingRow from "@/components/admin/BookingRow";
import BookingFilterBar from "@/components/admin/BookingFilterBar";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";

export const dynamic = "force-dynamic";

const BASE = "/yonetim/talepler";

// "Onaylandı" burada yok — onaylanan talep artık Rezervasyonlar sayfasına
// "geçmiş" gibi görünür (bkz. lib/data/admin/bookings.ts excludeStatus).
const filters: { key: BookingStatus | "all"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "new", label: bookingStatusLabel.new },
  { key: "contacted", label: bookingStatusLabel.contacted },
  { key: "quoted", label: bookingStatusLabel.quoted },
  { key: "lost", label: bookingStatusLabel.lost },
  { key: "cancelled", label: bookingStatusLabel.cancelled },
];

export default async function TaleplerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = bookingQuerySchema.parse(raw);

  // Varsayılan görünüm (durum sekmesi seçilmemiş) "Onaylandı" hariç hepsini
  // gösterir. Arama yapılırken bu sınır kalkar — eski/onaylı bir müşteriyi
  // ararken durum engeli olmasın.
  const filter: BookingFilters = {
    status: query.durum,
    excludeStatus: !query.durum && !query.q ? "confirmed" : undefined,
    q: query.q,
    villaId: query.villa,
    from: query.baslangic,
    to: query.bitis,
    sort: query.sirala === "giris" ? "checkin" : "new",
    page: query.sayfa,
  };

  const [page, counts, villas] = await Promise.all([
    getBookingRequests(filter),
    // Rozet sayıları durum dışındaki filtreleri paylaşır → listeyle tutarlı.
    getBookingCounts({ ...filter, status: undefined, excludeStatus: undefined }),
    getVillaOptions(),
  ]);

  // "Tümü" rozeti Onaylandı'yı saymaz — o artık Rezervasyonlar'ın alanı.
  const total =
    counts.new + counts.contacted + counts.quoted + counts.cancelled + counts.lost;
  const countFor = (k: BookingStatus | "all") =>
    k === "all" ? total : (counts[k] ?? 0);

  /** Mevcut filtreleri koruyarak URL üretir. */
  const hrefWith = (over: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      durum: query.durum,
      q: query.q,
      villa: query.villa,
      baslangic: query.baslangic,
      bitis: query.bitis,
      sirala: query.sirala,
      sayfa: query.sayfa ? String(query.sayfa) : undefined,
      ...over,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `${BASE}?${qs}` : BASE;
  };

  const firstIndex = (page.page - 1) * BOOKINGS_PAGE_SIZE + 1;
  const lastIndex = firstIndex + page.rows.length - 1;

  return (
    <div>
      <PageHeader
        title="Talepler"
        description="Rezervasyon talepleri. Onaylayınca tarihler villa takviminde otomatik kapanır."
      />

      {/* Durum sekmeleri — diğer filtreleri koruyarak */}
      <div className="mt-4 flex flex-wrap gap-2">
        {filters.map((f) => {
          const isActive =
            (f.key === "all" && !query.durum) || f.key === query.durum;
          return (
            <Link
              key={f.key}
              href={hrefWith({
                durum: f.key === "all" ? undefined : f.key,
                sayfa: undefined,
              })}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-300 ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "bg-white text-brand-800 ring-1 ring-sand-200 hover:bg-sand-50"
              }`}
            >
              {f.label}
              <span
                className={`ml-1.5 text-xs ${
                  isActive ? "text-white/80" : "text-brand-900/70"
                }`}
              >
                {countFor(f.key)}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-3">
        <BookingFilterBar villas={villas} />
      </div>

      {page.rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Inbox}
            title={
              total === 0 && !query.q && !query.villa
                ? "Henüz talep gelmedi"
                : "Bu filtrede talep yok"
            }
            description={
              total === 0 && !query.q && !query.villa
                ? "Siteden bir rezervasyon talebi gönderildiğinde burada görünür."
                : "Arama terimini veya tarih aralığını değiştirin ya da filtreleri temizleyin."
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-brand-900/70">
            <span className="font-semibold text-brand-950">{page.total}</span>{" "}
            talep bulundu · {firstIndex}–{lastIndex} arası gösteriliyor
          </p>

          <div className="mt-2 overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_1.2fr_1fr_auto] gap-4 border-b border-sand-200 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-brand-900/70 lg:grid">
              <span>Villa / Tarih</span>
              <span>Misafir</span>
              <span>Tutar</span>
              <span>İletişim</span>
              <span>Talep tarihi</span>
              <span>Durum</span>
            </div>

            <ul className="divide-y divide-sand-100">
              {page.rows.map((r) => (
                <BookingRow key={r.id} booking={r} />
              ))}
            </ul>
          </div>

          {/* Sayfalama */}
          {page.pageCount > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Link
                href={hrefWith({ sayfa: String(page.page - 1) })}
                aria-disabled={page.page <= 1}
                className={`inline-flex items-center gap-1 rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm font-semibold transition ${
                  page.page <= 1
                    ? "pointer-events-none opacity-40"
                    : "text-brand-800 hover:bg-sand-50"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                Önceki
              </Link>
              <span className="text-sm text-brand-900/70">
                Sayfa {page.page} / {page.pageCount}
              </span>
              <Link
                href={hrefWith({ sayfa: String(page.page + 1) })}
                aria-disabled={page.page >= page.pageCount}
                className={`inline-flex items-center gap-1 rounded-lg border border-sand-200 bg-white px-3 py-2 text-sm font-semibold transition ${
                  page.page >= page.pageCount
                    ? "pointer-events-none opacity-40"
                    : "text-brand-800 hover:bg-sand-50"
                }`}
              >
                Sonraki
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
