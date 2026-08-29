import { z } from "zod";
import Link from "next/link";
import { Layers } from "lucide-react";
import { getMultiCalendar } from "@/lib/data/admin/calendar";
import { PageHeader } from "@/components/admin/ui/PageHeader";
import { btnSecondary } from "@/components/admin/ui/styles";
import MultiCalendar from "@/components/admin/MultiCalendar";
import { businessToday } from "@/lib/format";

export const dynamic = "force-dynamic";

const WEEKS = 8; // 8 haftalık pencere (yol haritası 3.2)

/** UTC güne göre bugünün ISO'su (takvim gün mantığı saat dilimsiz). */
function todayISO(): string {
  // toISOString() UTC gunudur; takvim isletme gunune gore acilmali.
  return businessToday();
}

/** Verilen günü içeren haftanın Pazartesi'si — ızgara hafta hizalı başlasın. */
function mondayOf(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const dow = d.getUTCDay(); // 0=Paz
  const diff = dow === 0 ? -6 : 1 - dow;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

const isoDate = /^\d{4}-\d{2}-\d{2}$/;
const querySchema = z.object({
  baslangic: z.string().regex(isoDate).optional().catch(undefined),
});

export default async function TakvimPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { baslangic } = querySchema.parse(await searchParams);
  const from = mondayOf(baslangic ?? todayISO());

  const cal = await getMultiCalendar(from, WEEKS * 7);

  return (
    <div>
      <PageHeader
        title="Takvim"
        description="Tüm villaların doluluğu tek ekranda. Sarı işaretli günler, iki rezervasyon arasında boş kalan kısa gecelerdir — satışa en uygun tarihler."
        actions={
          <Link href="/yonetim/takvim/toplu" className={btnSecondary}>
            <Layers className="h-4 w-4" />
            Toplu güncelleme
          </Link>
        }
      />

      <div className="mt-4">
        <MultiCalendar
          from={cal.from}
          days={cal.days}
          villas={cal.villas}
          weeks={WEEKS}
        />
      </div>
    </div>
  );
}
