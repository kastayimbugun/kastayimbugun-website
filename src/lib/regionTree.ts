/**
 * Bölge ağacı — saf (IO'suz) yardımcılar.
 *
 * NEDEN AYRI DOSYA: `lib/data/admin/regions.ts` `server-only`'dir, bu yüzden
 * istemci bileşenleri oradan DEĞER (sabit/fonksiyon) alamaz, yalnızca tip
 * alabilir. Sınır ve ağaç kurma mantığı hem sunucuda (veri katmanı + action)
 * hem istemcide (RegionTreeClient, RegionForm) gerektiği için tek kaynak burası.
 *
 * TEMEL KURAL: derinlik `parent_id` zincirinden HESAPLANIR; `regions.depth`
 * sütunu okunmaz. Sütun türetilmiş bir önbellektir ve bozuk olabilir — bu kod
 * migration uygulanmadan da doğru çalışmak zorundadır.
 */

/**
 * Bir bölgenin izin verilen en büyük `depth` değeri (kök = 0). 8 → en fazla
 * 9 kademeli zincir.
 *
 * NEDEN SINIR VAR: tamamen sınırsız derinlik sürükle-bırak arayüzünü
 * kullanılamaz hâle getirir — girinti ekrandan taşar, hangi bloğun nereye
 * gittiği okunmaz olur.
 *
 * NEDEN 8: bugünkü en derin gerçek zincir 6
 * (Antalya > Kaş > Kaş Merkez > İslamlar > Üzümlü > Patara > Kışla), yani iki
 * kademe pay kalıyor. Üst taraftan da bir tavan var: veritabanındaki
 * `regions_no_cycle` trigger'ı (migration 0025) 10 basamaktan uzun parent
 * zincirini ham Postgres istisnasıyla reddediyor. Uygulama sınırı onun ALTINDA
 * kalmalı ki kullanıcı ham hata yerine anlaşılır bir mesaj görsün.
 *
 * ESKİ HATALI DAVRANIŞ: sınır 3'tü ve üç ayrı yere elle yazılmıştı (veri
 * katmanındaki `depth < 3` filtresi + arayüzdeki iki `Math.min(..., 3)`).
 * Sonuç: 4-6. seviyedeki 7 bölge panelde hiç görünmüyor, düzenlenemiyor ve
 * taşınamıyordu. Sınır artık YALNIZCA burada tanımlıdır.
 */
export const MAX_REGION_DEPTH = 8;

/** Ağaç kurmak için gereken en küçük satır şekli. */
export interface RegionNodeInput {
  id: string;
  parentId: string | null;
}

/** Özyinelemeli düğüm: kaç seviye olursa olsun aynı tip. */
export interface RegionTreeNode<T extends RegionNodeInput> {
  region: T;
  /** `parent_id` zincirinden türetilmiş derinlik (kök = 0). */
  depth: number;
  children: RegionTreeNode<T>[];
}

export interface RegionTreeResult<T extends RegionNodeInput> {
  roots: RegionTreeNode<T>[];
  /**
   * Hiçbir köke bağlanamayan kayıtlar: üst bölgesi listede yok (kırık
   * `parent_id`) ya da bir döngüye takılmış. Ağacın dışında kalırlarsa panelde
   * görünmez olurlar — bu yüzden ayrı listede döndürülüp yine de gösterilirler.
   */
  orphans: T[];
}

/**
 * Düz satır listesinden özyinelemeli ağaç kurar.
 *
 * DERİNLİK KIRPILMAZ: `MAX_REGION_DEPTH` yalnızca YENİ yazmaları sınırlar.
 * Okurken sınırın üstündeki eski kayıtlar da ağaca girer; aksi hâlde bu hatanın
 * ta kendisi tekrarlanır (görünmeyen bölge = düzeltilemeyen bölge).
 */
export function buildRegionTree<T extends RegionNodeInput>(
  rows: readonly T[]
): RegionTreeResult<T> {
  const byId = new Map<string, T>(rows.map((r) => [r.id, r]));
  const childrenOf = new Map<string, T[]>();
  const roots: T[] = [];
  const orphans: T[] = [];
  const orphanIds = new Set<string>();

  for (const row of rows) {
    const parentId = row.parentId;
    if (!parentId) {
      roots.push(row);
      continue;
    }
    // Kendi kendinin üstü ya da var olmayan bir üst → yetim.
    if (parentId === row.id || !byId.has(parentId)) {
      orphans.push(row);
      orphanIds.add(row.id);
      continue;
    }
    const list = childrenOf.get(parentId);
    if (list) list.push(row);
    else childrenOf.set(parentId, [row]);
  }

  const visited = new Set<string>();
  const attach = (row: T, depth: number): RegionTreeNode<T> => {
    visited.add(row.id);
    const children = childrenOf.get(row.id) ?? [];
    return {
      region: row,
      depth,
      // `visited` kontrolü savunma amaçlı: DB'de döngü olsa bile sonsuz
      // özyineleme yerine düğüm bir kez işlenir.
      children: children
        .filter((c) => !visited.has(c.id))
        .map((c) => attach(c, depth + 1)),
    };
  };

  const treeRoots = roots.map((r) => attach(r, 0));

  // Köklerden ulaşılamayan kayıtlar (döngü halkası) da kaybolmasın.
  for (const row of rows) {
    if (!visited.has(row.id) && !orphanIds.has(row.id)) {
      orphans.push(row);
      orphanIds.add(row.id);
    }
  }

  return { roots: treeRoots, orphans };
}

/** Ağacı ekranda göründüğü sırayla (DFS) düz listeye açar. */
export function flattenRegionTree<T extends RegionNodeInput>(
  nodes: readonly RegionTreeNode<T>[]
): Array<T & { depth: number }> {
  const out: Array<T & { depth: number }> = [];
  const walk = (list: readonly RegionTreeNode<T>[]) => {
    for (const node of list) {
      out.push({ ...node.region, depth: node.depth } as T & { depth: number });
      walk(node.children);
    }
  };
  walk(nodes);
  return out;
}

/**
 * `id → parentId` haritasından derinlik. Zincir kopuksa ya da döngüye
 * girerse yürüyüşü durdurur (sonsuz döngü yok).
 */
export function regionDepthOf(
  id: string,
  parentOf: ReadonlyMap<string, string | null>
): number {
  let depth = 0;
  let cur = parentOf.get(id) ?? null;
  const seen = new Set<string>([id]);
  while (cur && !seen.has(cur) && parentOf.has(cur)) {
    seen.add(cur);
    depth++;
    cur = parentOf.get(cur) ?? null;
  }
  return depth;
}

/**
 * Bir bölgenin üst zinciri — kökten aşağıya, kendisi hariç.
 * Ekmek kırıntısı ("Antalya › Kaş › Kalkan") üretmek için.
 */
export function regionAncestors<T extends RegionNodeInput>(
  id: string,
  byId: ReadonlyMap<string, T>
): T[] {
  const chain: T[] = [];
  const seen = new Set<string>([id]);
  let cur = byId.get(id)?.parentId ?? null;
  while (cur && !seen.has(cur)) {
    const parent = byId.get(cur);
    if (!parent) break;
    seen.add(cur);
    chain.unshift(parent);
    cur = parent.parentId;
  }
  return chain;
}

/**
 * Bir bölge ve tüm alt ağacının id'leri (kendisi dahil).
 * Üst bölge seçiminde kullanılır: bir bölge kendi alt bölgesinin altına
 * taşınamaz (DB'deki `regions_no_cycle` trigger'ı da reddeder).
 */
export function regionSubtreeIds<T extends RegionNodeInput>(
  rootId: string,
  rows: readonly T[]
): Set<string> {
  const childrenOf = new Map<string, string[]>();
  for (const row of rows) {
    if (!row.parentId) continue;
    const list = childrenOf.get(row.parentId);
    if (list) list.push(row.id);
    else childrenOf.set(row.parentId, [row.id]);
  }

  const ids = new Set<string>([rootId]);
  const stack = [rootId];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    for (const childId of childrenOf.get(current) ?? []) {
      if (ids.has(childId)) continue; // döngü koruması
      ids.add(childId);
      stack.push(childId);
    }
  }
  return ids;
}

/**
 * Seviye adı. Beşinci seviyeden sonrası için özel bir ad yok — sayıyla
 * gösterilir ki derin zincirler yine de okunabilir kalsın.
 */
const REGION_LEVEL_LABELS = ["İl", "İlçe", "Bölge", "Alt Bölge", "Mevki"];

export function regionLevelLabel(depth: number): string {
  return REGION_LEVEL_LABELS[depth] ?? `Alt Konum (${depth + 1}. seviye)`;
}
