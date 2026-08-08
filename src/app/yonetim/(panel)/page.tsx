import Link from "next/link";
import {
  LogIn,
  LogOut as LogOutIcon,
  Home,
  Clock,
  TrendingUp,
  Wallet,
  Inbox,
  Timer,
  ChevronRight,
} from "lucide-react";
import { getDashboardOverview } from "@/lib/data/admin/stats";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { cardCls, mutedCls } from "@/components/admin/ui/styles";
import { formatPrice } from "@/lib/format";
import { waitingBadge, formatDuration } from "@/lib/bookingWaiting";

export const dynamic = "force-dynamic";

function Tile({
  icon: Icon,
  label,
  value,
  sub,
  href,
  tone = "text-brand-700 bg-brand-50",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
  sub?: string;
  href?: string;
  tone?: string;
}) {
  const content = (
    <>
      <div className="flex items-start justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        {href && (
          <ChevronRight className="h-4 w-4 text-brand-900/30 transition group-hover:text-brand-600" />
        )}
      </div>
      <div className="mt-3 text-2xl font-extrabold text-brand-950">{value}</div>
      <div className={`text-sm ${mutedCls}`}>{label}</div>
      {sub && <div className="mt-0.5 text-xs text-brand-900/70">{sub}</div>}
    </>
  );

  return href ? (
    <Link
      href={href}
      className={`group ${cardCls} block p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand-300`}
    >
      {content}
    </Link>
  ) : (
    <div className={`${cardCls} p-5 shadow-sm`}>{content}</div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-900/70">
      {children}
    </h2>
  );
}

export default async function DashboardPage() {
  const s = await getDashboardOverview();

  const occupancyRate =
    s.villasPublished > 0
      ? Math.round((s.occupiedTodayCount / s.villasPublished) * 100)
      : 0;
  const conversionRate =
    s.monthRequestsTotal > 0
      ? Math.round((s.monthConfirmedCount / s.monthRequestsTotal) * 100)
      : 0;

  return (
    <div>
      <PageHeader title="Panel" description="Bugünün özeti" />

      {/* Bugün */}
      <div className="mt-5">
        <SectionTitle>Bugün</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            icon={LogIn}
            label="Bugün giriş"
            value={s.todayCheckIns.length}
            href="/yonetim/rezervasyonlar"
            tone="text-emerald-700 bg-emerald-50"
          />
          <Tile
            icon={LogOutIcon}
            label="Bugün çıkış"
            value={s.todayCheckOuts.length}
            href="/yonetim/rezervasyonlar"
            tone="text-sky-700 bg-sky-50"
          />
          <Tile
            icon={Home}
            label="Şu an dolu villa"
            value={`${s.occupiedTodayCount} / ${s.villasPublished}`}
            sub={`Doluluk %${occupancyRate}`}
            href="/yonetim/villalar"
          />
          <Tile
            icon={Clock}
            label="Yanıt bekleyen talep"
            value={s.pendingRequestsTotal}
            href="/yonetim/talepler?durum=new"
            tone="text-sun-700 bg-sun-50"
          />
        </div>

        {(s.todayCheckIns.length > 0 || s.todayCheckOuts.length > 0) && (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {s.todayCheckIns.length > 0 && (
              <div className={`${cardCls} p-4`}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-900/70">
                  Bugün giriş yapacaklar
                </h3>
                <ul className="divide-y divide-sand-100">
                  {s.todayCheckIns.map((a) => (
                    <li key={a.bookingId} className="py-2 text-sm">
                      <span className="font-semibold text-brand-900">
                        {a.guestName}
                      </span>{" "}
                      <span className={mutedCls}>· {a.villaName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {s.todayCheckOuts.length > 0 && (
              <div className={`${cardCls} p-4`}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-brand-900/70">
                  Bugün çıkış yapacaklar
                </h3>
                <ul className="divide-y divide-sand-100">
                  {s.todayCheckOuts.map((a) => (
                    <li key={a.bookingId} className="py-2 text-sm">
                      <span className="font-semibold text-brand-900">
                        {a.guestName}
                      </span>{" "}
                      <span className={mutedCls}>· {a.villaName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Yanıt bekleyen talepler */}
      <div className="mt-6">
        <SectionTitle>Yanıt bekleyen talepler</SectionTitle>
        {s.pendingRequests.length === 0 ? (
          <EmptyState icon={Inbox} title="Bekleyen talep yok" />
        ) : (
          <div className={`${cardCls} overflow-hidden`}>
            <ul className="divide-y divide-sand-100">
              {s.pendingRequests.map((p) => {
                const w = waitingBadge(p.createdAt);
                return (
                  <li key={p.id}>
                    <Link
                      href="/yonetim/talepler?durum=new"
                      className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-brand-900">
                          {p.fullName}
                        </div>
                        <div className={`text-sm ${mutedCls}`}>{p.villaName}</div>
                      </div>
                      <StatusBadge tone={w.tone} className="shrink-0">
                        {w.label}
                      </StatusBadge>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {s.pendingRequestsTotal > s.pendingRequests.length && (
              <Link
                href="/yonetim/talepler?durum=new"
                className="block border-t border-sand-100 px-4 py-2.5 text-center text-sm font-semibold text-brand-700 hover:bg-sand-50 hover:underline"
              >
                Tümünü gör ({s.pendingRequestsTotal})
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Bu ay */}
      <div className="mt-6">
        <SectionTitle>Bu ay</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            icon={TrendingUp}
            label="Talep → onay dönüşümü"
            value={`%${conversionRate}`}
            sub={`${s.monthConfirmedCount} / ${s.monthRequestsTotal} talep`}
          />
          <Tile
            icon={Wallet}
            label="Onaylı rezervasyon tutarı"
            value={formatPrice(s.monthConfirmedRevenue)}
          />
          <Tile
            icon={Inbox}
            label="Son 7 günde gelen talep"
            value={s.last7DaysRequests}
            href="/yonetim/talepler"
          />
          {/* Ölçmek tek başına davranışı değiştirir (yol haritası 2.4). */}
          <Tile
            icon={Timer}
            label="Ortalama ilk yanıt"
            value={
              s.avgResponseMinutes != null
                ? formatDuration(s.avgResponseMinutes)
                : "—"
            }
            sub={s.avgResponseMinutes != null ? "son 30 gün" : "henüz ölçüm yok"}
          />
        </div>
      </div>
    </div>
  );
}
