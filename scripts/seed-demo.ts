/**
 * Demo verisini (src/lib/villas.ts + categories.ts) Supabase'e aktarır.
 *
 * Çalıştırma:  node --env-file=.env.local scripts/seed-demo.ts
 *
 * Tekrar tekrar çalıştırılabilir: villa slug'ı üzerinden upsert eder,
 * bağlı kayıtları (görsel/sezon/blok/kategori) silip yeniden yazar.
 *
 * NOT: Bu script service_role anahtarını kullanır, RLS'i atlar.
 * Yalnızca yerelde, kurulum sırasında çalıştırılır.
 */
import { createClient } from "@supabase/supabase-js";
import { villas, regions, villaCode } from "../src/lib/villas.ts";
import { villaCategories } from "../src/lib/categories.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "HATA: NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.\n" +
      "Komutu --env-file=.env.local ile çalıştırdığından emin ol."
  );
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });

/** Hata varsa scripti durdur, sessizce devam etme. */
function check(step: string, error: { message: string } | null) {
  if (error) {
    console.error(`\nHATA (${step}): ${error.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------
// 1) Bölgeler
// ---------------------------------------------------------------
const regionRows = regions.map((r, i) => ({
  slug: r.slug,
  name: r.name,
  province: r.province,
  sort_order: i,
}));

const { data: regionData, error: regionErr } = await db
  .from("regions")
  .upsert(regionRows, { onConflict: "slug" })
  .select("id, name");
check("bölgeler", regionErr);

const regionIdByName = new Map(regionData!.map((r) => [r.name, r.id]));
console.log(`Bölge      : ${regionData!.length}`);

// ---------------------------------------------------------------
// 2) Kategoriler
// ---------------------------------------------------------------
const categoryRows = villaCategories.map((c, i) => ({
  slug: c.slug,
  name_tr: c.titleTr,
  name_en: c.titleEn,
  desc_tr: c.descTr,
  desc_en: c.descEn,
  color: c.color,
  image: c.image,
  featured_on_home: c.featuredOnHome,
  featured: c.featuredOnHome,
  icon:
    (c.icon as unknown as { displayName?: string; name?: string })
      .displayName ??
    (c.icon as unknown as { name?: string }).name ??
    null,
  sort_order: i,
}));

const { data: catData, error: catErr } = await db
  .from("categories")
  .upsert(categoryRows, { onConflict: "slug" })
  .select("id, slug");
check("kategoriler", catErr);

const categoryIdBySlug = new Map(catData!.map((c) => [c.slug, c.id]));
console.log(`Kategori   : ${catData!.length}`);

// ---------------------------------------------------------------
// 3) Villalar + bağlı kayıtlar
// ---------------------------------------------------------------
const CLEANING_FEE = 1500; // eskiden BookingBox.tsx'te sabitti
const SERVICE_RATE = 0.05;

let imageCount = 0;
let seasonCount = 0;
let blockCount = 0;

for (const v of villas) {
  const { data: villaRow, error: villaErr } = await db
    .from("villas")
    .upsert(
      {
        slug: v.slug,
        name: v.name,
        code: villaCode(v.slug),
        region_id: regionIdByName.get(v.region) ?? null,
        status: "published",
        capacity: v.capacity,
        bedrooms: v.bedrooms,
        bathrooms: v.bathrooms,
        pool: v.pool,
        size_m2: v.size,
        distance_to_sea: v.distanceToSea,
        rating: v.rating,
        review_count: v.reviewCount,
        featured: v.featured,
        discount_percent: v.discountPercent ?? null,
        deal_tag: v.dealTag ?? null,
        check_in: v.checkIn,
        check_out: v.checkOut,
        min_nights: v.minNights,
        base_price: v.pricePerNight,
        cleaning_fee: CLEANING_FEE,
        service_rate: SERVICE_RATE,
        description_tr: v.descriptionTr,
        description_en: v.descriptionEn,
        video_url: v.videoUrl ?? null,
        amenities: v.amenities,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();
  check(`villa ${v.slug}`, villaErr);

  const villaId = villaRow!.id;

  // Bağlı kayıtları temizle — script tekrar çalıştırılabilir olsun
  for (const table of [
    "villa_images",
    "villa_seasons",
    "villa_blocks",
    "villa_categories",
  ]) {
    const { error } = await db.from(table).delete().eq("villa_id", villaId);
    check(`${table} temizliği`, error);
  }

  // Görseller — demo aşamasında tam URL, Faz 3'te Storage yolu olacak
  const imageRows = v.images.map((src, i) => ({
    villa_id: villaId,
    storage_path: src,
    sort_order: i,
    alt_tr: `${v.name} — ${v.region}`,
    alt_en: `${v.name} — ${v.region}`,
  }));
  const { error: imgErr } = await db.from("villa_images").insert(imageRows);
  check(`${v.slug} görselleri`, imgErr);
  imageCount += imageRows.length;

  // Sezon fiyatları
  const seasonRows = v.seasons.map((s) => ({
    villa_id: villaId,
    label_tr: s.labelTr,
    label_en: s.labelEn,
    starts_on: s.start,
    ends_on: s.end,
    price: s.price,
  }));
  const { error: seasonErr } = await db.from("villa_seasons").insert(seasonRows);
  check(`${v.slug} sezonları`, seasonErr);
  seasonCount += seasonRows.length;

  // Dolu tarihler
  const blockRows = v.bookedRanges.map((b) => ({
    villa_id: villaId,
    starts_on: b.start,
    ends_on: b.end,
    source: "booking" as const,
    note: "demo veri",
  }));
  if (blockRows.length) {
    const { error: blockErr } = await db.from("villa_blocks").insert(blockRows);
    check(`${v.slug} dolu tarihleri`, blockErr);
    blockCount += blockRows.length;
  }

  // Kategori bağları
  const catLinks = villaCategories
    .map((c, ci) => ({ c, ci, pos: c.villaSlugs.indexOf(v.slug) }))
    .filter((x) => x.pos >= 0)
    .map((x) => ({
      villa_id: villaId,
      category_id: categoryIdBySlug.get(x.c.slug)!,
      sort_order: x.pos,
    }));
  if (catLinks.length) {
    const { error: linkErr } = await db
      .from("villa_categories")
      .insert(catLinks);
    check(`${v.slug} kategorileri`, linkErr);
  }
}

console.log(`Villa      : ${villas.length}`);
console.log(`Görsel     : ${imageCount}`);
console.log(`Sezon      : ${seasonCount}`);
console.log(`Dolu tarih : ${blockCount}`);
console.log("\nAktarım tamam.");
