import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  getAdminVilla,
  getVillaForEdit,
  type VillaStatus,
} from "@/lib/data/admin/villas";
import { getRegionOptions } from "@/lib/data/admin/regions";
import Tabs from "@/components/admin/Tabs";
import VillaForm from "@/components/admin/VillaForm";
import ImageManager from "@/components/admin/ImageManager";
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
  const [full, detail, regions] = await Promise.all([
    getVillaForEdit(id),
    getAdminVilla(id),
    getRegionOptions(),
  ]);
  if (!full || !detail) notFound();

  const s = statusMeta[full.status];

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
        <h1 className="text-xl font-extrabold text-brand-950">{full.name}</h1>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${s.cls}`}>
          {s.label}
        </span>
        <Link
          href={`/villa/${full.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
        >
          Sitede gör <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

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
                  <BlockEditor villaId={full.id} blocks={detail.blocks} />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
