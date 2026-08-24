import Link from "next/link";
import { ClipboardList, ChevronLeft, ChevronRight, Settings2 } from "lucide-react";
import {
  getApplications,
  getApplicationCounts,
  APPLICATIONS_PAGE_SIZE,
  type ApplicationFilters,
} from "@/lib/data/admin/applications";
import {
  applicationQuerySchema,
  applicationStatusLabel,
  type ApplicationStatus,
} from "@/lib/schemas/villaApplication";
import ApplicationRow from "@/components/admin/ApplicationRow";
import ApplicationFilterBar from "@/components/admin/ApplicationFilterBar";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";
import { btnSecondary } from "@/components/admin/ui/styles";

export const dynamic = "force-dynamic";

const BASE = "/yonetim/villa-basvurulari";

const filters: { key: ApplicationStatus | "all"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "new", label: applicationStatusLabel.new },
  { key: "contacted", label: applicationStatusLabel.contacted },
  { key: "accepted", label: applicationStatusLabel.accepted },
  { key: "rejected", label: applicationStatusLabel.rejected },
  { key: "archived", label: applicationStatusLabel.archived },
];

export default async function VillaApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = applicationQuerySchema.parse(raw);

  const filter: ApplicationFilters = {
    status: query.durum,
    q: query.q,
    page: query.sayfa,
  };

  const [page, counts] = await Promise.all([
    getApplications(filter),
    getApplicationCounts({ ...filter, status: undefined }),
  ]);

  const total =
    counts.new + counts.contacted + counts.accepted + counts.rejected + counts.archived;
  const countFor = (k: ApplicationStatus | "all") =>
    k === "all" ? total : (counts[k] ?? 0);

  const hrefWith = (over: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      durum: query.durum,
      q: query.q,
      sayfa: query.sayfa ? String(query.sayfa) : undefined,
      ...over,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `${BASE}?${qs}` : BASE;
  };

  const firstIndex = (page.page - 1) * APPLICATIONS_PAGE_SIZE + 1;
  const lastIndex = firstIndex + page.rows.length - 1;

  return (
    <div>
      <PageHeader
        title="Villa Başvuruları"
        description="Villa sahiplerinin listeleme başvuruları. Sorular ve alanlar ayarlardan yönetilir."
        actions={
          <Link href={`${BASE}/sorular`} className={btnSecondary}>
            <Settings2 className="h-4 w-4" />
            Form soruları
          </Link>
        }
      />

      {/* Durum sekmeleri */}
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
        <ApplicationFilterBar />
      </div>

      {page.rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={ClipboardList}
            title={
              total === 0 && !query.q
                ? "Henüz başvuru gelmedi"
                : "Bu filtrede başvuru yok"
            }
            description={
              total === 0 && !query.q
                ? "Ana sayfadaki “Hemen Başvurun” formundan bir başvuru geldiğinde burada görünür."
                : "Arama terimini değiştirin ya da filtreleri temizleyin."
            }
          />
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-brand-900/70">
            <span className="font-semibold text-brand-950">{page.total}</span>{" "}
            başvuru bulundu · {firstIndex}–{lastIndex} arası gösteriliyor
          </p>

          <div className="mt-2 overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <div className="hidden grid-cols-[auto_1.4fr_1.3fr_1fr_auto] gap-4 border-b border-sand-200 px-5 py-3 text-[11px] font-bold uppercase tracking-wide text-brand-900/70 lg:grid">
              <span>Kapak</span>
              <span>Villa / Konum</span>
              <span>Sahibi / İletişim</span>
              <span>Başvuru tarihi</span>
              <span>Durum</span>
            </div>

            <ul className="divide-y divide-sand-100">
              {page.rows.map((r) => (
                <ApplicationRow key={r.id} application={r} />
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
