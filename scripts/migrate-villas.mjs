/**
 * Eski siteden (kastayimbugunvillalari.com) villa göçü.
 *
 * `scratch/migrate_batch.js`'in yerini alır. Ayrıştırma mantığı oradan geldi ve
 * çalıştığı için korundu; değişen kısım veri kalitesi ve çalıştırılabilirlik.
 *
 * Neden yeniden yazıldı (29.08.2026 denetimi):
 *   1. Sitemap yolu başka bir aracın geçici klasörüne sabitlenmişti → artık
 *      gerçek sitemap URL'inden okunuyor (`--sitemap-file` ile dosya da verilebilir).
 *   2. Hiçbir doğrulama yoktu; service_role ile doğrudan yazıyordu. Aykırı fiyat,
 *      yinelenen bölge ve temizlenmemiş açıklama boşlukları buradan geliyordu.
 *      Artık her kayıt kalite kontrolünden geçiyor ve şüpheliler raporlanıyor.
 *   3. Tekrar çalıştırılamıyordu → artık DB'de olan slug atlanıyor (idempotent),
 *      600 villada yarıda kalırsa kaldığı yerden devam eder.
 *   4. Gecikme yoktu → istekler arasında bekleme var, kendi eski siteni yormasın.
 *
 * VARSAYILAN DAVRANIŞ: --dry-run. Hiçbir şey yazmaz, yalnızca ne olacağını ve
 * hangi kayıtların şüpheli olduğunu raporlar. Yazmak için --write vermelisin.
 *
 * Kullanım:
 *   node --env-file=.env.local scripts/migrate-villas.mjs                 # deneme, 20 villa
 *   node --env-file=.env.local scripts/migrate-villas.mjs --limit 600     # deneme, hepsi
 *   node --env-file=.env.local scripts/migrate-villas.mjs --limit 600 --write
 *
 * Görseller BU script'te yüklenmez: `storage_path` alanına geçici olarak eski
 * sitenin URL'si yazılır, sonra `scripts/sync-villa-images.mjs` çalıştırılır.
 * O ikinci adım atlanırsa görseller eski siteye bağlı kalır ve o site kapanınca
 * kırılır — bugünkü 4 ölü URL tam olarak bu yüzden oluştu.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// ---------------------------------------------------------------------------
// Argümanlar
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const has = (name) => argv.includes(name);

const LIMIT = parseInt(arg("--limit", "20"), 10);
const WRITE = has("--write");
const SITEMAP_URL = arg("--sitemap", "https://www.kastayimbugunvillalari.com/sitemap.xml");
const SITEMAP_FILE = arg("--sitemap-file", null);
const DELAY_MS = parseInt(arg("--delay", "400"), 10);

// Aynı villada en ucuz ve en pahalı sezon arasındaki oran bunu aşarsa şüpheli
// sayılır. Gerçek bir villada 4x fark olabilir (düşük sezon / bayram); 8x
// neredeyse her zaman eksik/fazla hane demektir (12.500 yerine 125.000 gibi).
const PRICE_RATIO_LIMIT = 8;

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.\n" +
      "Çalıştırma: node --env-file=.env.local scripts/migrate-villas.mjs"
  );
  process.exit(1);
}
const supabase = createClient(url, key);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
const TR_MONTHS = {
  ocak: "01", şubat: "02", subat: "02", mart: "03", nisan: "04",
  mayıs: "05", mayis: "05", haziran: "06", temmuz: "07", ağustos: "08",
  agustos: "08", eylül: "09", eylul: "09", ekim: "10", kasım: "11",
  kasim: "11", aralık: "12", aralik: "12",
};

function parseTrDate(str) {
  if (!str) return null;
  const m = str.trim().toLowerCase("tr").match(/(\d{1,2})\s+(\S+)\s+(\d{4})/);
  if (!m) return null;
  const month = TR_MONTHS[m[2]];
  if (!month) return null;
  return `${m[3]}-${month}-${m[1].padStart(2, "0")}`;
}

/** Türkçe karakterleri koruyarak slug üretir (lib/slugify.ts ile aynı kurallar). */
function slugify(text) {
  return String(text)
    .replace(/İ/g, "i")
    .toLowerCase("tr")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i").replace(/ğ/g, "g").replace(/ü/g, "u")
    .replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Açıklama metnini normalize eder.
 *
 * Eski sitedeki içerikte 250 karaktere varan boşluk blokları var ve site
 * bunları olduğu gibi basıyordu (villa detayında devasa boşluk olarak görünür).
 * Satır yapısı korunur, yalnızca aşırı boşluk sadeleştirilir.
 */
function normalizeText(s) {
  if (!s) return "";
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/&nbsp;/gi, " ")
    .replace(/[ \t ]{2,}/g, " ")   // yatay boşluk yığınları → tek boşluk
    .replace(/\n{3,}/g, "\n\n")          // 3+ boş satır → 1 boş satır
    .split("\n").map((l) => l.trim()).join("\n")
    .trim();
}

const AMENITY_MAP = [
  [/özel havuz|ozel havuz/i, "privatePool"],
  [/ısıtmalı havuz|isitmali havuz/i, "heatedPool"],
  [/korunaklı|korumalı|müstakil havuz/i, "protectedPool"],
  [/çocuk havuz/i, "kidsPool"],
  [/wi-?fi|internet|kablosuz/i, "wifi"],
  [/klima/i, "airCon"],
  [/deniz manzara/i, "seaView"],
  [/doğa manzara|orman manzara/i, "natureView"],
  [/jakuzi/i, "jacuzzi"],
  [/sauna/i, "sauna"],
  [/barbekü|barbeku|mangal/i, "bbq"],
  [/otopark|araç park/i, "parking"],
  [/evcil/i, "petFriendly"],
  [/bebek yatağı|bebek karyola/i, "babyCot"],
  [/bulaşık makine/i, "dishwasher"],
  [/çamaşır makine/i, "washingMachine"],
  [/mutfak/i, "kitchen"],
  [/tv|televizyon/i, "tv"],
  [/şömine|somine/i, "fireplace"],
  [/spor salon|fitness/i, "gym"],
  [/oyun oda/i, "gameRoom"],
  [/çocuk güvenlik|korkuluk/i, "childproof"],
  [/jeneratör|jenerator/i, "generator"],
];
const mapAmenity = (s) => AMENITY_MAP.find(([re]) => re.test(s))?.[1] ?? null;

// ---------------------------------------------------------------------------
// HTML ayrıştırma (scratch/migrate_batch.js'ten korundu — çalışıyor)
// ---------------------------------------------------------------------------
function parseVillaHtml(html, pageUrl) {
  if (!html.includes('id="detail"') && !html.includes('class="detail-slider-1"')) {
    return null;
  }

  const name = html.match(/<h1>\s*(.*?)\s*<\/h1>/i)?.[1]?.trim() ?? "";
  const rawSlug = pageUrl.match(/\/tr\/([^/]+)\//)?.[1] ?? name;
  const slug = slugify(rawSlug);

  const locationRaw =
    html.match(/class="loc">[\s\S]*?<span>\s*(.*?)\s*<\/span>/i)?.[1]?.trim() ?? "";
  const [rawProvince, rawRegion] = locationRaw.includes("/")
    ? locationRaw.split("/").map((s) => s.trim())
    : ["Kaş", locationRaw || "Kaş"];

  const num = (re, def) => {
    const m = html.match(re);
    return m ? parseInt(m[1], 10) : def;
  };
  const capacity = num(/class="sp sp1">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Kişilik/i, 2);
  const bedrooms = num(/class="sp sp2">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Yatak Odası/i, 1);
  const bathrooms = num(/class="sp sp3">[\s\S]*?<b>\s*(\d+)\s*<\/b>\s*Banyo/i, 1);

  const images = [];
  for (const m of html.matchAll(/data-full=["']([^"']+)["']/g)) {
    if (!images.includes(m[1])) images.push(m[1]);
  }
  if (images.length === 0) {
    const re = /href=["'](https:\/\/www\.kastayimbugunvillalari\.com\/upload\/catalog\/[^"']+\.(?:jpg|png|jpeg|webp))["']/gi;
    for (const m of html.matchAll(re)) {
      if (!images.includes(m[1])) images.push(m[1]);
    }
  }

  const descRaw =
    html.match(/<div class="detail-text">\s*<p>\s*([\s\S]*?)\s*<\/p>\s*<\/div>/i)?.[1] ?? "";
  const descriptionTr = normalizeText(descRaw.replace(/<[^>]+>/g, ""));

  const amenities = new Set();
  for (const m of html.matchAll(
    /<li><i class="fa fa-check-square-o"[^>]*><\/i>\s*(.*?)\s*<\/li>/gi
  )) {
    const k = mapAmenity(m[1].trim());
    if (k) amenities.add(k);
  }

  const seasons = [];
  const priceRe =
    /<li class="price_block"[^>]*>[\s\S]*?<span class="dt">\s*(.*?)\s*<\/span>[\s\S]*?<span class="pr">\s*&#8378;\s*([\d.\s]+)\s*<\/span>[\s\S]*?<\/li>/gi;
  for (const m of html.matchAll(priceRe)) {
    const range = m[1].trim();
    const price = parseInt(m[2].replace(/[^\d]/g, ""), 10) || 0;
    const [a, b] = range.split("~").map((s) => s.trim());
    const starts_on = parseTrDate(a);
    const ends_on = parseTrDate(b);
    if (starts_on && ends_on && ends_on > starts_on) {
      seasons.push({ starts_on, ends_on, price, rawRange: range });
    }
  }

  let distance_to_sea = null;
  const distRe =
    /<li class="[^"]*">\s*<span class="s1"><i[^>]*><\/i>\s*(.*?)\s*<\/span>\s*<span class="s2">\s*(.*?)\s*<\/span>\s*<\/li>/gi;
  for (const m of html.matchAll(distRe)) {
    if (m[1].trim().toLowerCase("tr").includes("plaj")) {
      const km = parseFloat(m[2].match(/([\d.]+)/)?.[1] ?? "");
      if (Number.isFinite(km)) distance_to_sea = Math.round(km * 1000);
    }
  }

  const prices = seasons.map((s) => s.price).filter((p) => p > 0);
  const base_price = prices.length ? Math.min(...prices) : null;

  return {
    slug, name, rawProvince, rawRegion,
    capacity, bedrooms, bathrooms,
    descriptionTr, amenities: [...amenities],
    seasons, images, distance_to_sea, base_price,
    sourceUrl: pageUrl,
  };
}

// ---------------------------------------------------------------------------
// Kalite kontrolü — yazmadan önce her kayıt buradan geçer
// ---------------------------------------------------------------------------
function qualityIssues(v) {
  const out = [];
  if (!v.name) out.push("ad boş");
  if (!v.slug) out.push("slug üretilemedi");
  if (!v.base_price) out.push("hiç sezon fiyatı yok → taban fiyat belirlenemiyor");
  if (!v.images.length) out.push("hiç fotoğraf yok");
  if (!v.descriptionTr) out.push("açıklama boş");

  const prices = v.seasons.map((s) => s.price).filter((p) => p > 0);
  if (prices.length > 1) {
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (max / min > PRICE_RATIO_LIMIT) {
      out.push(
        `AYKIRI FİYAT: ${min.toLocaleString("tr-TR")} ₺ – ${max.toLocaleString("tr-TR")} ₺ ` +
          `(${(max / min).toFixed(1)}x fark, muhtemelen hane hatası)`
      );
    }
  }
  if (v.capacity > 30) out.push(`kapasite şüpheli: ${v.capacity}`);
  return out;
}

// ---------------------------------------------------------------------------
// Bölge çözümü — YİNELENEN KAYIT ÜRETMEZ
//
// Eski script her villada bölgeyi adıyla arıyor ve bulamazsa yenisini
// ekliyordu; küçük yazım farkları ("İslamlar" / "Islamlar") yinelenen bölge
// üretiyordu. Burada eşleştirme slug üzerinden yapılır ve yeni bölge yalnızca
// gerçekten yoksa açılır.
// ---------------------------------------------------------------------------
async function buildRegionResolver() {
  const { data, error } = await supabase
    .from("regions")
    .select("id, name, slug, parent_id, depth");
  if (error) throw new Error(`Bölgeler okunamadı: ${error.message}`);

  const bySlug = new Map((data ?? []).map((r) => [r.slug, r]));
  const created = [];

  return {
    /**
     * Bölgeyi bulur; yoksa açar ve ÜST BÖLGEYE BAĞLAR.
     *
     * `parent_id` vermemek sessiz bir hata üretir: bölge kökte kalır, il
     * kartındaki sayaç onu saymaz ve arama açılırında ilin yanında ayrı bir
     * kök öğe gibi görünür. Mevcut katalogda "Gökseki" (2 villa) ve
     * "Çukurbağ" (4 villa) tam olarak böyle: Kaş'a bağlı olmadıkları için
     * Kaş kartı 21 yerine 15 gösteriyor.
     */
    async resolve(rawRegion, rawProvince, write) {
      const slug = slugify(rawRegion || rawProvince || "");
      if (!slug) return { id: null, note: "bölge adı yok" };

      const hit = bySlug.get(slug);
      if (hit) {
        // Zaten var ama köke bağlıysa ve bir üst adayı varsa bildir.
        if (!hit.parent_id && rawProvince && slugify(rawProvince) !== slug) {
          return { id: hit.id, note: `mevcut bölge köke bağlı: ${hit.name} → ${rawProvince} altına alınmalı` };
        }
        return { id: hit.id, note: null };
      }

      // Üst bölge (il/ilçe) — yoksa o da açılır.
      let parent = null;
      const parentSlug = rawProvince ? slugify(rawProvince) : "";
      if (parentSlug && parentSlug !== slug) {
        parent = bySlug.get(parentSlug) ?? null;
        if (!parent && write) {
          const { data: p } = await supabase
            .from("regions")
            .insert({ slug: parentSlug, name: rawProvince, province: rawProvince, depth: 0 })
            .select("id, name, slug, parent_id, depth")
            .single();
          if (p) {
            bySlug.set(parentSlug, p);
            created.push(p.slug);
            parent = p;
          }
        }
      }

      if (!write) {
        return {
          id: null,
          note:
            `YENİ BÖLGE açılacak: ${rawRegion} (${slug})` +
            (parentSlug && parentSlug !== slug ? ` → üst: ${rawProvince}` : " → ÜST YOK, kökte kalacak"),
        };
      }

      const { data: ins, error } = await supabase
        .from("regions")
        .insert({
          slug,
          name: rawRegion,
          province: rawProvince || rawRegion,
          parent_id: parent?.id ?? null,
          depth: parent ? (parent.depth ?? 0) + 1 : 0,
        })
        .select("id, name, slug, parent_id, depth")
        .single();
      if (error || !ins) return { id: null, note: `bölge açılamadı: ${error?.message}` };
      bySlug.set(slug, ins);
      created.push(ins.slug);
      return { id: ins.id, note: `yeni bölge açıldı: ${ins.name}${parent ? ` (üst: ${parent.name})` : " — KÖKTE"}` };
    },
    created,
  };
}

// ---------------------------------------------------------------------------
// Ana akış
// ---------------------------------------------------------------------------
async function main() {
  console.log(
    `\n=== Villa göçü — ${WRITE ? "YAZMA MODU" : "DENEME (dry-run)"} · limit ${LIMIT} ===\n`
  );

  // 1) Sitemap
  let xml;
  if (SITEMAP_FILE) {
    xml = readFileSync(SITEMAP_FILE, "utf8");
    console.log(`Sitemap dosyadan okundu: ${SITEMAP_FILE}`);
  } else {
    const res = await fetch(SITEMAP_URL);
    if (!res.ok) {
      console.error(`Sitemap alınamadı (${res.status}): ${SITEMAP_URL}`);
      process.exit(1);
    }
    xml = await res.text();
    console.log(`Sitemap indirildi: ${SITEMAP_URL}`);
  }

  const urls = [
    ...new Set(
      [...xml.matchAll(
        /<loc>(https:\/\/www\.kastayimbugunvillalari\.com\/tr\/[^/<]+\/)<\/loc>/g
      )].map((m) => m[1])
    ),
  ];
  console.log(`Sitemap'te ${urls.length} villa URL'i bulundu.\n`);

  // 2) Zaten aktarılmışları atla (idempotent — yarıda kalırsa devam eder)
  const { data: existing, error: exErr } = await supabase.from("villas").select("slug");
  if (exErr) throw new Error(`Mevcut villalar okunamadı: ${exErr.message}`);
  const done = new Set((existing ?? []).map((v) => v.slug));
  if (done.size) console.log(`DB'de zaten ${done.size} villa var, bunlar atlanacak.\n`);

  const regions = await buildRegionResolver();

  const report = { imported: 0, skipped: 0, failed: 0, flagged: [] };

  for (const pageUrl of urls) {
    if (report.imported + report.failed >= LIMIT) break;

    const guessSlug = slugify(pageUrl.match(/\/tr\/([^/]+)\//)?.[1] ?? "");
    if (done.has(guessSlug)) {
      report.skipped++;
      continue;
    }

    try {
      const res = await fetch(pageUrl, {
        headers: { "User-Agent": "KastayimBugunMigration/1.0" },
      });
      await sleep(DELAY_MS); // eski siteyi yorma
      if (!res.ok) {
        console.warn(`  ⚠ ${res.status} — ${pageUrl}`);
        report.failed++;
        continue;
      }

      const villa = parseVillaHtml(await res.text(), pageUrl);
      if (!villa) {
        report.skipped++;
        continue;
      }

      const issues = qualityIssues(villa);
      const region = await regions.resolve(villa.rawRegion, villa.rawProvince, WRITE);
      if (region.note) issues.push(region.note);

      const n = report.imported + 1;
      const mark = issues.length ? "⚠" : "✓";
      console.log(
        `${mark} [${n}] ${villa.name}  ·  ${villa.images.length} foto, ` +
          `${villa.seasons.length} sezon, taban ${villa.base_price ?? "—"} ₺`
      );
      for (const i of issues) console.log(`      → ${i}`);
      if (issues.length) report.flagged.push({ name: villa.name, slug: villa.slug, issues });

      if (!WRITE) {
        report.imported++;
        continue;
      }

      // --- Yazma ---
      const { data: row, error: vErr } = await supabase
        .from("villas")
        .insert({
          slug: villa.slug,
          name: villa.name,
          region_id: region.id,
          status: "draft", // BİLEREK taslak: yayına almadan önce panelden gözden geçir
          capacity: villa.capacity,
          bedrooms: villa.bedrooms,
          bathrooms: villa.bathrooms,
          pool: villa.amenities.includes("privatePool") ? "private" : "none",
          distance_to_sea: villa.distance_to_sea,
          base_price: villa.base_price ?? 0,
          description_tr: villa.descriptionTr,
          // İngilizce açıklama BİLEREK boş: eski script Türkçeyi kopyalıyordu,
          // yani "çevrilmiş" görünen ama aslında Türkçe olan içerik üretiyordu.
          description_en: null,
          amenities: villa.amenities,
        })
        .select("id")
        .single();

      if (vErr || !row) {
        console.error(`      ✗ villa yazılamadı: ${vErr?.message}`);
        report.failed++;
        continue;
      }

      if (villa.seasons.length) {
        const { error } = await supabase.from("villa_seasons").insert(
          villa.seasons.map((s) => ({
            villa_id: row.id,
            // Ham tarih aralığı yerine okunur etiket; eski script
            // "08 temmuz 2026 ~ 07 eylül 2026" yazıyordu ve panelde tarih
            // sütunu zaten aynı bilgiyi gösterdiği için tekrar oluyordu.
            label_tr: "Sezon",
            label_en: "Season",
            starts_on: s.starts_on,
            ends_on: s.ends_on,
            price: s.price,
          }))
        );
        if (error) console.error(`      ✗ sezonlar yazılamadı: ${error.message}`);
      }

      if (villa.images.length) {
        const { error } = await supabase.from("villa_images").insert(
          villa.images.map((u, i) => ({
            villa_id: row.id,
            storage_path: u, // GEÇİCİ — sync-villa-images.mjs bunu gerçek yola çevirir
            sort_order: i,
          }))
        );
        if (error) console.error(`      ✗ görseller yazılamadı: ${error.message}`);
      }

      report.imported++;
    } catch (e) {
      console.error(`  ✗ ${pageUrl}: ${e.message}`);
      report.failed++;
    }
  }

  // 3) Rapor
  console.log(`\n${"=".repeat(70)}`);
  console.log(
    `İşlenen: ${report.imported}   Atlanan: ${report.skipped}   Hatalı: ${report.failed}`
  );
  if (regions.created.length) {
    console.log(`Yeni açılan bölgeler: ${regions.created.join(", ")}`);
  }
  if (report.flagged.length) {
    console.log(`\n⚠ ELLE KONTROL GEREKEN ${report.flagged.length} VILLA:`);
    for (const f of report.flagged) {
      console.log(`  · ${f.name} (${f.slug})`);
      for (const i of f.issues) console.log(`      ${i}`);
    }
  }
  if (!WRITE) {
    console.log(
      `\nDENEME MODUYDU — hiçbir şey yazılmadı.\n` +
        `Rapordaki uyarıları gözden geçirdikten sonra --write ile tekrar çalıştır.`
    );
  } else {
    console.log(
      `\nSIRADAKİ ADIM ZORUNLU:\n` +
        `  node --env-file=.env.local scripts/sync-villa-images.mjs\n` +
        `Bu çalıştırılmazsa görseller eski siteye bağlı kalır ve o site kapanınca kırılır.`
    );
  }
  console.log(`${"=".repeat(70)}\n`);
}

main().catch((e) => {
  console.error("\nGöç başarısız:", e);
  process.exit(1);
});
