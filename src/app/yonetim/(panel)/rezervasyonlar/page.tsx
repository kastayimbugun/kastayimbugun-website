import Link from "next/link";
import { CalendarCheck, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  getBookingRequests,
  BOOKINGS_PAGE_SIZE,
  type BookingFilters,
} from "@/lib/data/admin/bookings";
import { getVillaOptions } from "@/lib/data/admin/villas";
import { bookingQuerySchema } from "@/lib/schemas/adminBooking";
import BookingRow from "@/components/admin/BookingRow";
import BookingFilterBar from "@/components/admin/BookingFilterBar";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";
import { btnPrimary } from "@/components/admin/ui/styles";

export const dynamic = "force-dynamic";

const BASE = "/yonetim/rezervasyonlar";

/**
 * Talepler'den farklı olarak sıralamanın varsayılanı "yaklaşan giriş" —
 * bu sayfanın cevapladığı soru "kim geliyor", "kim yazdı" değil.
 */
const sortOptions = [
  { value: "giris", label: "Önce yaklaşan giriş" },
  { value: "yeni", label: "Önce en yeni onay" },
];

export default async function RezervasyonlarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = bookingQuerySchema.parse(raw);

  const filter: BookingFilters = {
    status: "confirmed",
    q: query.q,
    villaId: query.villa,
    from: query.baslangic,
    to: query.bitis,
    sort: query.sirala === "yeni" ? "new" : "checkin",
    page: query.sayfa,
  };

  const [page, villas] = await Promise.all([
    getBookingRequests(filter),
    getVillaOptions(),
  ]);

  const hrefWith = (over: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
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
  const hasFilter = Boolean(query.q || query.villa || query.baslangic || query.bitis);

  const newButton = (
    <Link href="/yonetim/rezervasyonlar/yeni" className={btnPrimary}>
      <Plus className="h-4 w-4" />
      Yeni rezervasyon
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Rezervasyonlar"
        description="Onaylanmış, takvimde yer kaplayan rezervasyonlar. Talep onaylanınca otomatik burada görünür; telefonla gelen rezervasyonu da doğrudan buradan ekleyebilirsiniz."
        actions={newButton}
      />

      <div className="mt-4">
        <BookingFilterBar villas={villas} sortOptions={sortOptions} />
      </div>

      {page.rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={CalendarCheck}
            title={hasFilter ? "Bu filtrede rezervasyon yok" : "Henüz onaylı rezervasyon yok"}
            description={
              hasFilter
                ? "Arama terimini veya tarih aralığını değiştirin ya da filtreleri temizleyin."
                : "Bir talebi onayladığınızda ya da elle rezervasyon eklediğinizde burada görünür."
            }
            action={!hasFilter ? newButton : undefined}
          />
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-brand-900/70">
            <span className="font-semibold text-brand-950">{page.total}</span>{" "}
            rezervasyon bulundu · {firstIndex}–{lastIndex} arası gösteriliyor
          </p>

          <div className="mt-2 overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <div className="hidden grid-cols-[1.5fr_0.8fr_0.8fr_1.2fr_1fr_auto] gap-4 border-b border-sand-200 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-brand-900/70 lg:grid">
              <span>Villa / Tarih</span>
              <span>Misafir</span>
              <span>Tutar</span>
              <span>İletişim</span>
              <span>Onay tarihi</span>
              <span>Durum</span>
            </div>

            <ul className="divide-y divide-sand-100">
              {page.rows.map((r) => (
                <BookingRow key={r.id} booking={r} />
              ))}
            </ul>
          </div>

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
