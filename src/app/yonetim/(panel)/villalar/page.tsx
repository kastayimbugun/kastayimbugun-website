import Link from "next/link";
import { ChevronRight, ChevronLeft, Plus, Home } from "lucide-react";
import {
  getAdminVillas,
  getVillaCounts,
  VILLAS_PAGE_SIZE,
  type AdminVillaFilters,
  type VillaStatus,
} from "@/lib/data/admin/villas";
import { getRegionOptions } from "@/lib/data/admin/regions";
import { villaQuerySchema } from "@/lib/schemas/adminVilla";
import { formatPrice } from "@/lib/format";
import { villaStatusMeta } from "@/lib/adminMeta";
import VillaFilterBar from "@/components/admin/VillaFilterBar";
import { PageHeader, EmptyState } from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { btnPrimary } from "@/components/admin/ui/styles";

export const dynamic = "force-dynamic";

const BASE = "/yonetim/villalar";

const statusTabs: { key: VillaStatus | "all"; label: string }[] = [
  { key: "all", label: "Tümü" },
  { key: "published", label: villaStatusMeta.published.label },
  { key: "draft", label: villaStatusMeta.draft.label },
  { key: "archived", label: villaStatusMeta.archived.label },
];

export default async function VillalarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const query = villaQuerySchema.parse(raw);

  // Varsayılan görünüm arşivlenmiş villaları gizler — soft delete kaydı
  // saklar ama günlük listede yer kaplamamalı. Arama yapılırken bu sınır
  // kalkar: arşivdeki bir villayı adıyla arayan onu bulabilmeli.
  const filter: AdminVillaFilters = {
    status: query.durum,
    excludeStatus: !query.durum && !query.q ? "archived" : undefined,
    q: query.q,
    regionId: query.bolge,
    sort: query.sirala === "fiyat" ? "price" : query.sirala === "yeni" ? "new" : "name",
    page: query.sayfa,
  };

  const [page, counts, regions] = await Promise.all([
    getAdminVillas(filter),
    // Rozet sayıları durum dışındaki filtreleri paylaşır → listeyle tutarlı.
    getVillaCounts({ ...filter, status: undefined, excludeStatus: undefined }),
    getRegionOptions(),
  ]);

  // "Tümü" arşivi saymaz; varsayılan görünüm de onu göstermiyor.
  const activeTotal = counts.published + counts.draft;
  const countFor = (k: VillaStatus | "all") =>
    k === "all" ? activeTotal : counts[k];

  /** Mevcut filtreleri koruyarak URL üretir. */
  const hrefWith = (over: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = {
      durum: query.durum,
      q: query.q,
      bolge: query.bolge,
      sirala: query.sirala,
      sayfa: query.sayfa ? String(query.sayfa) : undefined,
      ...over,
    };
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    const qs = p.toString();
    return qs ? `${BASE}?${qs}` : BASE;
  };

  const firstIndex = (page.page - 1) * VILLAS_PAGE_SIZE + 1;
  const lastIndex = firstIndex + page.rows.length - 1;

  // Hiç villa yok mu, yoksa filtre mi boş sonuç veriyor? Boş ekranın metni buna göre değişir.
  const libraryEmpty =
    activeTotal + counts.archived === 0 && !query.q && !query.bolge;

  const newVillaButton = (
    <Link href="/yonetim/villalar/yeni" className={btnPrimary}>
      <Plus className="h-4 w-4" />
      Yeni villa
    </Link>
  );

  return (
    <div>
      <PageHeader
        title="Villalar"
        description="Düzenlemek için bir villa seçin veya yeni villa ekleyin."
        actions={libraryEmpty ? undefined : newVillaButton}
      />

      {/* Durum sekmeleri — diğer filtreleri koruyarak */}
      <div className="mt-4 flex flex-wrap gap-2">
        {statusTabs.map((t) => {
          const isActive =
            (t.key === "all" && !query.durum) || t.key === query.durum;
          return (
            <Link
              key={t.key}
              href={hrefWith({
                durum: t.key === "all" ? undefined : t.key,
                sayfa: undefined,
              })}
              aria-current={isActive ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-brand-300 ${
                isActive
                  ? "bg-brand-600 text-white"
                  : "bg-white text-brand-800 ring-1 ring-sand-200 hover:bg-sand-50"
              }`}
            >
              {t.label}
              <span
                className={`ml-1.5 text-xs ${
                  isActive ? "text-white/80" : "text-brand-900/70"
                }`}
              >
                {countFor(t.key)}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-3">
        <VillaFilterBar regions={regions} />
      </div>

      {page.rows.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={Home}
            title={libraryEmpty ? "Henüz villa yok" : "Bu filtrede villa yok"}
            description={
              libraryEmpty
                ? "İlk villanızı ekleyin. Ekledikten sonra fotoğraf, sezon fiyatı ve takvim bilgilerini aynı sayfadan yönetebilirsiniz."
                : "Arama terimini veya bölgeyi değiştirin ya da filtreleri temizleyin."
            }
            action={libraryEmpty ? newVillaButton : undefined}
          />
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-brand-900/70">
            <span className="font-semibold text-brand-950">{page.total}</span>{" "}
            villa bulundu · {firstIndex}–{lastIndex} arası gösteriliyor
          </p>

          <div className="mt-2 overflow-hidden rounded-2xl border border-sand-200 bg-white">
            <ul className="divide-y divide-sand-100">
              {page.rows.map((v) => {
                const s = villaStatusMeta[v.status];
                return (
                  <li key={v.id}>
                    <Link
                      href={`/yonetim/villalar/${v.id}`}
                      className="flex items-center gap-4 px-5 py-3.5 transition hover:bg-sand-50 focus-visible:ring-2 focus-visible:ring-brand-300"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-brand-900">
                            {v.name}
                          </span>
                          <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                        </div>
                        <div className="text-sm text-brand-900/70">
                          {v.regionName}
                          {v.code ? ` · ${v.code}` : ""}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-brand-950">
                        {formatPrice(v.basePrice)}
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-brand-900/50" />
                    </Link>
                  </li>
                );
              })}
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
