import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { getAdminVilla, type VillaStatus } from "@/lib/data/admin/villas";
import SeasonEditor from "@/components/admin/SeasonEditor";
import BlockEditor from "@/components/admin/BlockEditor";

export const dynamic = "force-dynamic";

const statusMeta: Record<VillaStatus, { label: string; cls: string }> = {
  published: { label: "Yayında", cls: "bg-emerald-50 text-emerald-700" },
  draft: { label: "Taslak", cls: "bg-sun-50 text-sun-700" },
  archived: { label: "Arşiv", cls: "bg-sand-100 text-brand-900/50" },
};

export default async function VillaDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const villa = await getAdminVilla(id);
  if (!villa) notFound();

  const s = statusMeta[villa.status];

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/yonetim/villalar"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Villalar
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-extrabold text-brand-950">{villa.name}</h1>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}
        >
          {s.label}
        </span>
        <Link
          href={`/villa/${villa.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
        >
          Sitede gör <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Sezon fiyatları */}
      <section className="mt-5 rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-base font-bold text-brand-950">Sezon Fiyatları</h2>
        <p className="mb-3 mt-0.5 text-sm text-brand-900/55">
          Tarihe göre gecelik fiyat. Sezon dışı günlerde taban fiyat geçerlidir.
        </p>
        <SeasonEditor villaId={villa.id} seasons={villa.seasons} />
      </section>

      {/* Takvim / kapalı tarihler */}
      <section className="mt-5 rounded-2xl border border-sand-200 bg-white p-5">
        <h2 className="text-base font-bold text-brand-950">
          Takvim — Kapalı Tarihler
        </h2>
        <p className="mb-3 mt-0.5 text-sm text-brand-900/55">
          Bakım, kişisel kullanım vb. için tarih kapatın. Onaylı rezervasyonların
          blokları burada görünür ama Talepler ekranından yönetilir.
        </p>
        <BlockEditor villaId={villa.id} blocks={villa.blocks} />
      </section>
    </div>
  );
}
