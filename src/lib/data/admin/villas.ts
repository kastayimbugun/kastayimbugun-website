import "server-only";
import { supabaseSession } from "@/lib/supabase/session";

export type VillaStatus = "draft" | "published" | "archived";

export interface AdminVillaListItem {
  id: string;
  name: string;
  slug: string;
  status: VillaStatus;
  basePrice: number;
  regionName: string;
}

export interface AdminSeason {
  id: string;
  labelTr: string;
  labelEn: string;
  startsOn: string;
  endsOn: string;
  price: number;
}

export interface AdminBlock {
  id: string;
  startsOn: string;
  endsOn: string;
  source: "manual" | "booking" | "ical";
  note: string | null;
}

export interface AdminVillaDetail {
  id: string;
  name: string;
  slug: string;
  status: VillaStatus;
  seasons: AdminSeason[];
  blocks: AdminBlock[];
}

/** Panelde tüm villalar (taslak dahil; RLS staff'e izin verir). */
export async function getAdminVillas(): Promise<AdminVillaListItem[]> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villas")
    .select("id, name, slug, status, base_price, regions ( name )")
    .order("name");
  if (error) throw new Error(`Villalar okunamadı: ${error.message}`);

  return (data as unknown as Array<{
    id: string;
    name: string;
    slug: string;
    status: VillaStatus;
    base_price: number;
    regions: { name: string } | null;
  }>).map((v) => ({
    id: v.id,
    name: v.name,
    slug: v.slug,
    status: v.status,
    basePrice: Number(v.base_price),
    regionName: v.regions?.name ?? "—",
  }));
}

/** Tek villa: temel bilgi + sezonlar + bloklar. */
export async function getAdminVilla(
  id: string
): Promise<AdminVillaDetail | null> {
  const supabase = await supabaseSession();
  const { data, error } = await supabase
    .from("villas")
    .select(
      `id, name, slug, status,
       villa_seasons ( id, label_tr, label_en, starts_on, ends_on, price ),
       villa_blocks ( id, starts_on, ends_on, source, note )`
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Villa okunamadı: ${error.message}`);
  if (!data) return null;

  const row = data as unknown as {
    id: string;
    name: string;
    slug: string;
    status: VillaStatus;
    villa_seasons: Array<{
      id: string;
      label_tr: string;
      label_en: string;
      starts_on: string;
      ends_on: string;
      price: number;
    }>;
    villa_blocks: Array<{
      id: string;
      starts_on: string;
      ends_on: string;
      source: "manual" | "booking" | "ical";
      note: string | null;
    }>;
  };

  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    status: row.status,
    seasons: [...row.villa_seasons]
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
      .map((s) => ({
        id: s.id,
        labelTr: s.label_tr,
        labelEn: s.label_en,
        startsOn: s.starts_on,
        endsOn: s.ends_on,
        price: Number(s.price),
      })),
    blocks: [...row.villa_blocks]
      .sort((a, b) => a.starts_on.localeCompare(b.starts_on))
      .map((b) => ({
        id: b.id,
        startsOn: b.starts_on,
        endsOn: b.ends_on,
        source: b.source,
        note: b.note,
      })),
  };
}
