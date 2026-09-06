import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

/**
 * Sitemap'in veri erişimi.
 *
 * NEDEN AYRI BİR DOSYA: `src/app/sitemap.ts` bir rota; ARCHITECTURE.md §1
 * rotaların doğrudan Supabase sorgusu yazmasını yasaklıyor ("Sayfalar bile
 * doğrudan sorgu yazmaz"). Bugün `src/app/**` içinde tek bir `@supabase` import'u
 * yok, o sınır bozulmasın diye sorgular buraya alındı.
 *
 * NEDEN MEVCUT FONKSİYONLAR YETMİYOR:
 *  · `getVillaSlugs()` SAYFALAMASIZ ve `updated_at` getirmiyor.
 *  · `getCategories()` `villa_categories → villas` gömmesi yapıyor; sitemap'in
 *    ihtiyacı olan tek şey slug.
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ POSTGREST 1.000 SATIRDA SESSİZCE KIRPAR — bu dosyanın var oluş sebebi.    │
 * │ Ölçüldü (docs/denetim-yol-haritasi.md): 1.102 satırlık `villa_images`     │
 * │ tablosunda sınırsız sorgu 1.000 satır döndürdü ve HATA VERMEDİ. Yani      │
 * │ sayfalamasız bir sitemap "çalışır" ama eksiktir ve kimse fark etmez.      │
 * │ Katalog 602 villayla göç edecek, işletme 2.000'i konuşuyor.               │
 * │                                                                          │
 * │ Bu yüzden tablodan okuyan her fonksiyon `.range()` ile döngüde çeker.     │
 * └──────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Bir turda çekilen satır sayısı.
 *
 * Supabase'in `db-max-rows` varsayılanı 1.000. Döngünün bitiş koşulu "gelen
 * satır istenenden az" olduğu için sayfa boyutu bu tavanın ALTINDA kalmalı:
 * 1.000 isteyip 1.000 alsaydık son sayfayı ayırt edebilirdik ama tavan bir gün
 * 500'e çekilse döngü ilk turda "bitti" sanıp sessizce yarım listeyle dönerdi.
 * 500 hem tavanın yarısı hem de 2.000 villa için 4 gidiş-dönüş demek.
 */
export const SITEMAP_PAGE_SIZE = 500;

/**
 * Güvenlik freni. Bozuk bir sıralama yüzünden döngü sonlanmazsa (ör. sayfalar
 * arası satır eklenip çıkması) sitemap isteği sonsuza kadar sürmesin.
 * Google'ın tek dosya sınırı zaten 50.000 URL.
 */
const MAX_ROWS = 60_000;

/** `fetchAllPaged`'in beklediği yalın sonuç — Supabase tiplerini dışarı sızdırmaz. */
interface PagedResult<T> {
  rows: T[] | null;
  message: string | null;
}

/**
 * `fetchPage`'i satır bitene kadar çağırır ve hepsini birleştirir.
 *
 * `label` yalnızca hata mesajı için; sitemap tek bir tabloda patlarsa hangisi
 * olduğu görünsün.
 */
async function fetchAllPaged<T>(
  label: string,
  pageSize: number,
  fetchPage: (from: number, to: number) => Promise<PagedResult<T>>
): Promise<T[]> {
  const size = Math.max(1, Math.floor(pageSize));
  const all: T[] = [];

  for (let from = 0; from < MAX_ROWS; from += size) {
    const { rows, message } = await fetchPage(from, from + size - 1);
    if (message) throw new Error(`${label} okunamadı: ${message}`);

    const batch = rows ?? [];
    all.push(...batch);

    // Tam dolu sayfa geldiyse arkasında daha var olabilir; eksikse bitti.
    if (batch.length < size) break;
  }

  return all;
}

/** Sitemap girdisi: adres + (varsa) gerçek değişiklik zamanı. */
export interface SitemapEntry {
  slug: string;
  /** `updated_at`. Yoksa `null` — çağıran taraf `lastModified` alanını HİÇ basmaz. */
  updatedAt: string | null;
}

/**
 * Yayındaki villaların slug'ları + `updated_at`.
 *
 * Taslak (`draft`) ve arşiv (`archived`) villalar dışarıda: sitemap yalnızca
 * 200 dönen ve indekslenmesini istediğimiz adresleri listeler.
 *
 * `order("slug")` ZORUNLU: sıralamasız bir sorguda Postgres sayfalar arasında
 * satır sırasını koruma sözü vermez; aynı villa iki sayfada birden çıkabilir ya
 * da hiç çıkmayabilir. `slug` benzersiz olduğu için sıralama kararlıdır.
 *
 * `pageSize` yalnızca sayfalama döngüsünü küçük veriyle sınayabilmek için
 * dışarı açık (ör. 21 villayı 5'erli çekip 21 satır toplandığını doğrulamak).
 */
export async function getSitemapVillas(
  pageSize: number = SITEMAP_PAGE_SIZE
): Promise<SitemapEntry[]> {
  const rows = await fetchAllPaged<{ slug: string; updated_at: string | null }>(
    "Sitemap villaları",
    pageSize,
    async (from, to) => {
      const { data, error } = await supabaseServer()
        .from("villas")
        .select("slug, updated_at")
        .eq("status", "published")
        .order("slug")
        .range(from, to);
      return { rows: data, message: error?.message ?? null };
    }
  );

  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at ?? null }));
}

/**
 * Yayındaki dinamik sayfalar (`/sayfa/<slug>`) + `updated_at`.
 *
 * `getAllPublishedPageSlugs()` aynı işi yapıyor ama sayfalamasız ve tarihsiz.
 * Hukuki sayfalar bugün bir avuç; yine de aynı desende tutuldu — "küçük tablo"
 * varsayımı bu projede bir kez zaten kırıldı.
 */
export async function getSitemapPages(
  pageSize: number = SITEMAP_PAGE_SIZE
): Promise<SitemapEntry[]> {
  const rows = await fetchAllPaged<{ slug: string; updated_at: string | null }>(
    "Sitemap sayfaları",
    pageSize,
    async (from, to) => {
      const { data, error } = await supabaseServer()
        .from("pages")
        .select("slug, updated_at")
        .eq("status", "published")
        .order("slug")
        .range(from, to);
      return { rows: data, message: error?.message ?? null };
    }
  );

  return rows.map((r) => ({ slug: r.slug, updatedAt: r.updated_at ?? null }));
}

/**
 * Kategori slug'ları.
 *
 * `getCategories()` kullanılmadı: o fonksiyon her kategori için
 * `villa_categories → villas` gömmesi yapıyor ve sitemap'in ihtiyacı olan tek
 * alan slug. Üstelik gömülü satırlar da 1.000 sınırına tabi; kategori başına
 * villa listesi kırpılırsa "boş kategori" sanıp yanlışlıkla eleyebilirdik.
 *
 * `categories` tablosunda `updated_at` YOK (bkz. 0001_init.sql) — bu yüzden
 * `SitemapEntry` değil düz slug dizisi döner.
 */
export async function getSitemapCategorySlugs(
  pageSize: number = SITEMAP_PAGE_SIZE
): Promise<string[]> {
  const rows = await fetchAllPaged<{ slug: string }>(
    "Sitemap kategorileri",
    pageSize,
    async (from, to) => {
      const { data, error } = await supabaseServer()
        .from("categories")
        .select("slug")
        .order("slug")
        .range(from, to);
      return { rows: data, message: error?.message ?? null };
    }
  );

  return rows.map((r) => r.slug);
}
