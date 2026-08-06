import Image from "next/image";
import { notFound } from "next/navigation";
import { getBookingForConfirmation } from "@/lib/data/admin/bookings";
import { getAdminSiteSettings } from "@/lib/data/admin/site";
import { BackLink } from "@/components/admin/ui/PageHeader";
import PrintButton from "@/components/admin/PrintButton";
import { formatDate, formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

/** "16:00:00" → "16:00" (Postgres `time` sütunu saniyeli dönebilir). */
function shortTime(t: string) {
  return t.slice(0, 5);
}

const row = "grid grid-cols-2 gap-x-6 gap-y-0.5 py-1.5";
const label = "text-xs font-semibold uppercase tracking-wide text-brand-900/70";
const value = "text-sm font-semibold text-brand-950";

export default async function KonfirmasyonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [booking, settings] = await Promise.all([
    getBookingForConfirmation(id),
    getAdminSiteSettings(),
  ]);
  if (!booking) notFound();

  // Panelde doldurulmamış alanlarda belgenin bugünkü metni korunur.
  const brandName = settings.brandName ?? "Kaştayım Bugün Villaları";

  const remaining =
    booking.priceEstimate != null
      ? Math.max(0, booking.priceEstimate - booking.paidAmount)
      : null;
  const guestCount = booking.adults + booking.children;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="print:hidden">
        <BackLink href="/yonetim/talepler">Talepler</BackLink>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4 print:mt-0">
        <div className="flex items-center gap-3">
          {settings.logoImageUrl && (
            <Image
              src={settings.logoImageUrl}
              alt={brandName}
              width={240}
              height={80}
              // Yazdırmada da görünsün: arka plan yerine gerçek <img> öğesi.
              className="h-12 w-auto shrink-0 object-contain"
              priority
            />
          )}
          <div>
            <h1 className="text-xl font-extrabold text-brand-950">
              {brandName}
            </h1>
            <p className="text-sm text-brand-900/70">
              Rezervasyon Konfirmasyon Formu
            </p>
          </div>
        </div>
        <PrintButton />
      </div>

      <div className="mt-5 rounded-2xl border border-sand-200 bg-white p-5 print:border-none print:p-0 print:shadow-none">
        <div className="divide-y divide-sand-100">
          <div className={row}>
            <div>
              <div className={label}>Misafir</div>
              <div className={value}>{booking.fullName}</div>
            </div>
            <div>
              <div className={label}>Telefon</div>
              <div className={value}>{booking.phone}</div>
            </div>
          </div>

          {booking.email && (
            <div className={row}>
              <div>
                <div className={label}>E-posta</div>
                <div className={value}>{booking.email}</div>
              </div>
              <div>
                <div className={label}>Kişi sayısı</div>
                <div className={value}>
                  {guestCount} yetişkin+çocuk
                  {booking.babies > 0 && ` + ${booking.babies} bebek`}
                </div>
              </div>
            </div>
          )}

          <div className={row}>
            <div>
              <div className={label}>Giriş tarihi</div>
              <div className={value}>
                {formatDate(booking.checkIn)}
                {booking.villa && ` · ${shortTime(booking.villa.checkInTime)}`}
              </div>
            </div>
            <div>
              <div className={label}>Çıkış tarihi</div>
              <div className={value}>
                {formatDate(booking.checkOut)}
                {booking.villa && ` · ${shortTime(booking.villa.checkOutTime)}`}
              </div>
            </div>
          </div>

          <div className={row}>
            <div>
              <div className={label}>Villa</div>
              <div className={value}>{booking.villa?.name ?? "—"}</div>
            </div>
            <div>
              <div className={label}>Konaklama</div>
              <div className={value}>{booking.nights} gece</div>
            </div>
          </div>

          <div className={row}>
            <div>
              <div className={label}>Toplam fiyat</div>
              <div className={value}>
                {booking.priceEstimate != null
                  ? formatPrice(booking.priceEstimate)
                  : "—"}
              </div>
            </div>
            <div>
              <div className={label}>Ödenen</div>
              <div className={value}>{formatPrice(booking.paidAmount)}</div>
            </div>
          </div>

          <div className={row}>
            <div>
              <div className={label}>Girişte kalan ödeme</div>
              <div className={value}>
                {remaining != null ? formatPrice(remaining) : "—"}
              </div>
            </div>
            <div>
              <div className={label}>Hasar depozitosu</div>
              <div className={value}>{formatPrice(booking.damageDeposit)}</div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-3 border-t border-sand-100 pt-4 text-sm leading-relaxed text-brand-900/80">
          <p>
            <strong>Depozito prosedürü:</strong>{" "}
            {settings.confirmationDepositNote ??
              "Hasar depozitosu girişten önce tahsil edilir, çıkışta villada hasar/kayıp yoksa aynen iade edilir. Hasar veya eksik eşya durumunda tutar depozitodan karşılanır."}
          </p>
          <p>
            <strong>Giriş/çıkış:</strong>{" "}
            {settings.confirmationCheckinNote ?? (
              <>
                Yeni misafirlerimize villalar{" "}
                {booking.villa ? shortTime(booking.villa.checkInTime) : "16:00"}
                &apos;da hazır teslim edilir; temizlik ekibinin hazırlık
                yapabilmesi için çıkış saatine ({" "}
                {booking.villa
                  ? shortTime(booking.villa.checkOutTime)
                  : "10:00"}
                ) uyulması rica olunur.
              </>
            )}
          </p>
          {booking.villa && !booking.villa.petFriendly && (
            <p className="font-semibold text-rose-700">
              Bu villada evcil hayvan kabul edilmemektedir.
            </p>
          )}
        </div>

        {/* Belge altbilgisi — acente kimliği ve iletişim, panelden yönetilir. */}
        {(settings.agencyName ||
          settings.tursabNo ||
          settings.phone ||
          settings.email) && (
          <div className="mt-5 border-t border-sand-100 pt-3 text-xs text-brand-900/70">
            {[
              settings.agencyName,
              settings.tursabNo ? `TÜRSAB Belge No: ${settings.tursabNo}` : null,
              settings.phone,
              settings.email,
            ]
              .filter(Boolean)
              .join(" · ")}
            {settings.address && (
              <div className="mt-0.5">{settings.address}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
