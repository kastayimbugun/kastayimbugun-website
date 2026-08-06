import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { getAdminVilla, getVillaForEdit } from "@/lib/data/admin/villas";
import { getRegionOptions } from "@/lib/data/admin/regions";
import { villaStatusMeta } from "@/lib/adminMeta";
import { villaQuality } from "@/lib/villaQuality";
import QualityPanel from "@/components/admin/QualityPanel";
import Tabs from "@/components/admin/Tabs";
import VillaForm from "@/components/admin/VillaForm";
import ImageManager from "@/components/admin/ImageManager";
import SeasonEditor from "@/components/admin/SeasonEditor";
import BlockEditor from "@/components/admin/BlockEditor";
import { PageHeader, BackLink } from "@/components/admin/ui/PageHeader";
import StatusBadge from "@/components/admin/ui/StatusBadge";

export const dynamic = "force-dynamic";

export default async function VillaDetayPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [full, detail, regions] = await Promise.all([
    getVillaForEdit(id),
    getAdminVilla(id),
    getRegionOptions(),
  ]);
  if (!full || !detail) notFound();

  const s = villaStatusMeta[full.status];
  const quality = villaQuality({
    descriptionTr: full.descriptionTr,
    descriptionEn: full.descriptionEn,
    imageCount: full.images.length,
    basePrice: full.basePrice,
    seasonCount: detail.seasons.length,
    minNights: full.minNights,
  });

  return (
    <div className="mx-auto max-w-4xl">
      <BackLink href="/yonetim/villalar">Villalar</BackLink>

      <div className="mt-3">
        <PageHeader
          title={full.name}
          badge={
            <>
              <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
              <Link
                href={`/villa/${full.slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 rounded text-sm font-semibold text-brand-700 hover:underline focus-visible:ring-2 focus-visible:ring-brand-300"
              >
                Sitede gör <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </>
          }
        />
      </div>

      {quality.missing.length > 0 && (
        <div className="mt-4">
          <QualityPanel quality={quality} />
        </div>
      )}

      <div className="mt-5">
        <Tabs
          tabs={[
            {
              id: "info",
              label: "Bilgiler",
              content: <VillaForm villa={full} regions={regions} mode="edit" />,
            },
            {
              id: "images",
              label: `Görseller (${full.images.length})`,
              content: (
                <div className="rounded-2xl border border-sand-200 bg-white p-5">
                  <ImageManager villaId={full.id} images={full.images} />
                </div>
              ),
            },
            {
              id: "seasons",
              label: "Sezon Fiyatları",
              content: (
                <div className="rounded-2xl border border-sand-200 bg-white p-5">
                  <SeasonEditor villaId={full.id} seasons={detail.seasons} />
                </div>
              ),
            },
            {
              id: "calendar",
              label: "Takvim",
              content: (
                <div className="rounded-2xl border border-sand-200 bg-white p-5">
                  <BlockEditor
                    villaId={full.id}
                    blocks={detail.blocks}
                    seasons={detail.seasons}
                  />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
