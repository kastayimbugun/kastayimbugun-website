"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/staff";
import { supabaseSession } from "@/lib/supabase/session";
import {
  regionFormSchema,
  updateRegionSchema,
  deleteRegionSchema,
  regionIdSchema,
  type RegionFormInput,
} from "@/lib/schemas/adminRegion";
import { toFieldErrors } from "@/lib/schemas/fieldErrors";
import { storeImage, removeImage } from "@/lib/images/store";
import { MAX_REGION_DEPTH, regionDepthOf } from "@/lib/regionTree";

export type RegionResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      error:
        | "auth"
        | "validation"
        | "slug"
        | "inuse"
        | "cycle"
        | "depth"
        | "generic";
      fields?: Record<string, string>;
    };

export type RegionImageResult =
  | { ok: true }
  | { ok: false; error: "auth" | "validation" | "toobig" | "type" | "generic" };

type SessionClient = Awaited<ReturnType<typeof supabaseSession>>;

/**
 * Ağaç sıralaması yükü. Şema burada duruyor çünkü yalnızca bu action
 * kullanıyor; `depth` kasıtlı olarak YOK — istemciden gelen derinliğe
 * güvenilmez, sunucu `parent_id` zincirinden kendisi hesaplar.
 */
const treeOrderSchema = z
  .array(
    z.object({
      id: z.uuid(),
      parentId: z.uuid().nullable(),
      sortOrder: z.number().int().min(0).max(100000),
    })
  )
  .max(5000);

/** Tüm bölgelerin `id → parent_id` haritası — derinlik ve döngü hesabı için. */
async function loadParentGraph(
  supabase: SessionClient
): Promise<Map<string, string | null> | null> {
  const { data, error } = await supabase.from("regions").select("id, parent_id");
  if (error) return null;
  return new Map<string, string | null>(
    (data ?? []).map((r) => [r.id as string, (r.parent_id as string | null) ?? null])
  );
}

/** Bir bölgenin altındaki en uzun zincirin kaç kademe olduğu (yaprak = 0). */
function subtreeHeight(
  rootId: string,
  parentOf: ReadonlyMap<string, string | null>
): number {
  const childrenOf = new Map<string, string[]>();
  for (const [id, parentId] of parentOf) {
    if (!parentId) continue;
    const list = childrenOf.get(parentId);
    if (list) list.push(id);
    else childrenOf.set(parentId, [id]);
  }

  let height = 0;
  const seen = new Set<string>([rootId]);
  let level = [rootId];
  while (level.length > 0) {
    const next: string[] = [];
    for (const id of level) {
      for (const childId of childrenOf.get(id) ?? []) {
        if (seen.has(childId)) continue; // döngü koruması
        seen.add(childId);
        next.push(childId);
      }
    }
    if (next.length > 0) height++;
    level = next;
  }
  return height;
}

/**
 * Veritabanının döngü koruması devreye girdi mi?
 * `regions_no_cycle` trigger'ı (migration 0025) ve `regions_no_self_parent`
 * kısıtı. Bu hatayı "generic" diye yutmak kullanıcıyı çaresiz bırakıyordu.
 */
function isCycleDbError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  return (
    message.includes("döngüsel") || message.includes("regions_no_self_parent")
  );
}

function isTooDeepDbError(error: { message?: string } | null) {
  return (error?.message ?? "").includes("çok derin");
}

async function toRow(
  supabase: SessionClient,
  d: RegionFormInput,
  isNew = false
) {
  let depth = 0;
  let province = d.province;

  if (d.parentId) {
    const { data: parent } = await supabase
      .from("regions")
      .select("name")
      .eq("id", d.parentId)
      .maybeSingle();

    if (parent) {
      province = parent.name;
      // NEDEN sütun değil zincir: `regions.depth` bozuk olabilir (25 kaydın
      // 7'sinde yanlıştı). `parent.depth + 1` okunsaydı yeni kayıt da bozuk
      // doğardı. Derinlik her zaman `parent_id` zincirinden hesaplanır.
      const parentOf = await loadParentGraph(supabase);
      depth = parentOf ? regionDepthOf(d.parentId, parentOf) + 1 : 1;
    }
  }

  // Yeni bölge eklenirken sıralamayı otomatik hesapla:
  // Aynı parent altındaki en yüksek sort_order'ın bir fazlası.
  let sortOrder = d.sortOrder;
  if (isNew) {
    const query = d.parentId
      ? supabase.from("regions").select("sort_order").eq("parent_id", d.parentId)
      : supabase.from("regions").select("sort_order").is("parent_id", null);

    const { data: siblings } = await query.order("sort_order", { ascending: false }).limit(1);
    if (siblings && siblings.length > 0) {
      sortOrder = (siblings[0].sort_order ?? 0) + 1;
    } else {
      sortOrder = 0;
    }
  }

  return {
    name: d.name,
    province: province,
    slug: d.slug,
    sort_order: sortOrder,
    parent_id: d.parentId || null,
    depth: depth,
  };
}


function revalidate() {
  revalidatePath("/yonetim/bolgeler");
  revalidatePath("/", "layout"); // footer + site bölge listeleri
}

export async function createRegion(input: unknown): Promise<RegionResult> {
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = regionFormSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }

  const supabase = await supabaseSession();
  const rowData = await toRow(supabase, parsed.data, true); // isNew=true: sort_order otomatik atanır

  if (rowData.depth > MAX_REGION_DEPTH) {
    return {
      ok: false,
      error: "depth",
      fields: {
        parentId: `En fazla ${MAX_REGION_DEPTH + 1} kademe olabilir. Daha üst bir konum seçin.`,
      },
    };
  }

  const { data, error } = await supabase
    .from("regions")
    .insert(rowData)
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu kısa ad başka bölgede kullanılıyor." },
      };
    }
    if (isTooDeepDbError(error)) return { ok: false, error: "depth" };
    if (isCycleDbError(error)) return { ok: false, error: "cycle" };
    return { ok: false, error: "generic" };
  }
  revalidate();
  return { ok: true, id: data.id };
}

export async function updateRegion(input: unknown): Promise<RegionResult> {
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = updateRegionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "validation", fields: toFieldErrors(parsed.error) };
  }
  const { id, ...fields } = parsed.data;

  const supabase = await supabaseSession();

  // Döngü ve derinlik kontrolü ÜST BÖLGE değişiyorsa. Veritabanındaki
  // `regions_no_cycle` trigger'ı da reddeder ama ham Postgres hatası
  // kullanıcıya hiçbir şey anlatmaz — burada anlaşılır mesajla durduruyoruz.
  if (fields.parentId) {
    const parentOf = await loadParentGraph(supabase);
    if (!parentOf) return { ok: false, error: "generic" };

    // Yeni üst, bu bölgenin kendisi ya da alt ağacındaysa döngü olur.
    let cursor: string | null = fields.parentId;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      if (cursor === id) return { ok: false, error: "cycle" };
      seen.add(cursor);
      cursor = parentOf.get(cursor) ?? null;
    }

    // Taşınan bölgenin ALTINDAKİ zincir de sınırı aşmamalı.
    const newDepth = regionDepthOf(fields.parentId, parentOf) + 1;
    if (newDepth + subtreeHeight(id, parentOf) > MAX_REGION_DEPTH) {
      return {
        ok: false,
        error: "depth",
        fields: {
          parentId: `Bu taşıma ${MAX_REGION_DEPTH + 1} kademe sınırını aşıyor. Daha üst bir konum seçin.`,
        },
      };
    }
  }

  const rowData = await toRow(supabase, fields);
  const { error } = await supabase
    .from("regions")
    .update(rowData)
    .eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return {
        ok: false,
        error: "slug",
        fields: { slug: "Bu kısa ad başka bölgede kullanılıyor." },
      };
    }
    if (isTooDeepDbError(error)) return { ok: false, error: "depth" };
    if (isCycleDbError(error)) return { ok: false, error: "cycle" };
    return { ok: false, error: "generic" };
  }
  revalidate();
  return { ok: true, id };
}

/** Bölgenin mevcut kart görselinin Storage yolu (eskisini silmek için). */
async function currentHero(
  supabase: Awaited<ReturnType<typeof supabaseSession>>,
  id: string
) {
  const { data } = await supabase
    .from("regions")
    .select("slug, hero_image")
    .eq("id", id)
    .maybeSingle();
  return data ?? null;
}

/** Bölge kartı görselini yükler. FormData: regionId, file. */
export async function uploadRegionHero(
  formData: FormData
): Promise<RegionImageResult> {
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = regionIdSchema.safeParse({ id: formData.get("regionId") });
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const region = await currentHero(supabase, parsed.data.id);
  if (!region) return { ok: false, error: "validation" };

  const stored = await storeImage(
    supabase,
    formData.get("file"),
    `bolgeler/${region.slug}`
  );
  if (!stored.ok) return stored;

  const { error } = await supabase
    .from("regions")
    .update({ hero_image: stored.path })
    .eq("id", parsed.data.id);
  if (error) {
    await removeImage(supabase, stored.path); // kayıt olmadıysa dosyayı bırakma
    return { ok: false, error: "generic" };
  }

  await removeImage(supabase, region.hero_image);
  revalidate();
  return { ok: true };
}

export async function removeRegionHero(
  input: unknown
): Promise<RegionImageResult> {
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = regionIdSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const region = await currentHero(supabase, parsed.data.id);

  const { error } = await supabase
    .from("regions")
    .update({ hero_image: null })
    .eq("id", parsed.data.id);
  if (error) return { ok: false, error: "generic" };

  await removeImage(supabase, region?.hero_image);
  revalidate();
  return { ok: true };
}

export async function updateRegionsTreeOrder(
  items: { id: string; parentId: string | null; sortOrder: number }[]
): Promise<RegionResult> {
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = treeOrderSchema.safeParse(items);
  if (!parsed.success) return { ok: false, error: "validation" };
  if (parsed.data.length === 0) return { ok: true };

  const rows = parsed.data;

  // Aynı bölge iki kez gönderilmişse sıralama belirsiz kalır — reddet.
  const parentOf = new Map<string, string | null>();
  for (const row of rows) {
    if (parentOf.has(row.id)) return { ok: false, error: "validation" };
    parentOf.set(row.id, row.parentId);
  }

  // Bilinmeyen bir üst id istemciden gelmiş olamaz: ağaç bütün hâlinde gönderilir.
  for (const row of rows) {
    if (row.parentId && !parentOf.has(row.parentId)) {
      return { ok: false, error: "validation" };
    }
  }

  // DERİNLİK İSTEMCİDEN ALINMAZ, burada `parent_id` zincirinden hesaplanır.
  // Böylece arayüzde bir kırpma hatası olsa bile sütun bozulmaz — bu hatanın
  // kaynağı tam olarak istemcinin `Math.min(depth, 3)` ile kırptığı değerin
  // olduğu gibi kaydedilmesiydi.
  const depths = new Map<string, number>();
  for (const row of rows) {
    let cursor: string | null = row.parentId;
    let depth = 0;
    const seen = new Set<string>([row.id]);
    while (cursor) {
      if (seen.has(cursor)) return { ok: false, error: "cycle" };
      seen.add(cursor);
      depth++;
      cursor = parentOf.get(cursor) ?? null;
    }
    if (depth > MAX_REGION_DEPTH) return { ok: false, error: "depth" };
    depths.set(row.id, depth);
  }

  const supabase = await supabaseSession();

  // SIRA ÖNEMLİ: satırlar tek tek yazılıyor. İki bölge yer değiştirdiğinde
  // (A'nın üstü B iken B'nin üstü A oluyor) rastgele sırada yazmak ARADA
  // gerçek bir döngü oluşturur ve `regions_no_cycle` trigger'ı yazmayı yarıda
  // keser. Yeni derinliğe göre artan sırada yazınca her satırın üstü kendisinden
  // önce yazılmış olur; ara durumda da döngü oluşamaz.
  const ordered = [...rows].sort(
    (a, b) => (depths.get(a.id) ?? 0) - (depths.get(b.id) ?? 0)
  );

  // Toplu güncelleme: parent_id, depth ve sort_order
  for (const row of ordered) {
    const { error } = await supabase
      .from("regions")
      .update({
        parent_id: row.parentId,
        depth: depths.get(row.id) ?? 0,
        sort_order: row.sortOrder,
      })
      .eq("id", row.id);

    if (error) {
      if (isTooDeepDbError(error)) return { ok: false, error: "depth" };
      if (isCycleDbError(error)) return { ok: false, error: "cycle" };
      return { ok: false, error: "generic" };
    }
  }

  revalidate();
  return { ok: true };
}

export async function deleteRegion(input: unknown): Promise<RegionResult> {
  const staff = await requirePermission("regions");
  if (!staff) return { ok: false, error: "auth" };

  const parsed = deleteRegionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "validation" };

  const supabase = await supabaseSession();
  const { error } = await supabase
    .from("regions")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    // 23503 = foreign_key_violation (bölgeye bağlı villa var)
    if (error.code === "23503") return { ok: false, error: "inuse" };
    return { ok: false, error: "generic" };
  }
  revalidate();
  return { ok: true };
}
