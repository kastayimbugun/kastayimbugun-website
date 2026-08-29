/**
 * Eski siteden gelen görselleri Supabase Storage'a taşır.
 *
 * `migrate-villas.mjs` görselleri indirmez; `villa_images.storage_path` alanına
 * geçici olarak eski sitenin URL'sini yazar. Bu script o kayıtları bulur,
 * dosyayı indirir, Storage'a yükler ve `storage_path`'i gerçek yola çevirir.
 *
 * BU ADIM ATLANIRSA görseller eski siteye bağlı kalır ve o site kapandığında
 * kırılır. Bugünkü katalogda 4 ölü URL tam olarak bu yüzden var.
 *
 * `scratch/sync_images_to_storage.js`'in yerini alır. Farkı:
 *   - Paralel (varsayılan 6 eşzamanlı) — 18.000 görselde sıralı çalışmak saatler sürer
 *   - Kaldığı yerden devam eder: her görsel tek tek güncellenir, yarıda kesilse
 *     bile tamamlananlar korunur ve tekrar çalıştırınca kalanlardan devam eder
 *   - Başarısızları raporlar, tek bir hata tüm işi durdurmaz
 *
 * Kullanım:
 *   node --env-file=.env.local scripts/sync-villa-images.mjs              # deneme
 *   node --env-file=.env.local scripts/sync-villa-images.mjs --write
 *   node --env-file=.env.local scripts/sync-villa-images.mjs --write --concurrency 8
 */

import { createClient } from "@supabase/supabase-js";

const argv = process.argv.slice(2);
const arg = (n, d = null) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const WRITE = argv.includes("--write");
const CONCURRENCY = Math.min(parseInt(arg("--concurrency", "6"), 10), 12);
const BUCKET = "villa-images";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY gerekli.\n" +
      "Çalıştırma: node --env-file=.env.local scripts/sync-villa-images.mjs"
  );
  process.exit(1);
}
const supabase = createClient(url, key);

/** Uzak URL'den güvenli bir depolama yolu üretir. */
function storagePathFor(villaSlug, remoteUrl, index) {
  const ext = (remoteUrl.match(/\.(jpg|jpeg|png|webp)(?:\?|$)/i)?.[1] ?? "jpg").toLowerCase();
  const stamp = Date.now().toString(36);
  return `villalar/${villaSlug}/${String(index).padStart(3, "0")}-${stamp}.${ext}`;
}

/** Sabit eşzamanlılıkla iş kuyruğu — hepsini aynı anda başlatmak siteyi yorar. */
async function runPool(items, limit, worker) {
  let cursor = 0;
  let done = 0;
  const results = [];
  const next = async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i], i);
      done++;
      if (done % 25 === 0 || done === items.length) {
        process.stdout.write(`\r  ilerleme: ${done}/${items.length}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, next));
  process.stdout.write("\n");
  return results;
}

async function main() {
  console.log(
    `\n=== Görsel senkronu — ${WRITE ? "YAZMA MODU" : "DENEME (dry-run)"} · ` +
      `eşzamanlılık ${CONCURRENCY} ===\n`
  );

  // Henüz taşınmamış olanlar: storage_path hâlâ eski siteyi gösteriyor.
  // Sayfalama ile çekilir — PostgREST varsayılan satır sınırı 1000'dir ve
  // 18.000 görselde sessizce kırpılırdı.
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("villa_images")
      .select("id, sort_order, storage_path, villas ( slug )")
      .like("storage_path", "http%")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Görseller okunamadı: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  if (rows.length === 0) {
    console.log("Taşınacak görsel yok — hepsi zaten Storage'da. ✓\n");
    return;
  }
  console.log(`Taşınacak ${rows.length} görsel bulundu.\n`);

  if (!WRITE) {
    const byVilla = new Map();
    for (const r of rows) {
      const s = r.villas?.slug ?? "(villa yok)";
      byVilla.set(s, (byVilla.get(s) ?? 0) + 1);
    }
    console.log("Villa başına görsel sayısı (ilk 15):");
    [...byVilla.entries()].slice(0, 15).forEach(([s, n]) => console.log(`  ${s}: ${n}`));
    console.log(
      `\n${byVilla.size} villa etkilenecek.\n` +
        `DENEME MODUYDU — hiçbir şey indirilmedi/yüklenmedi.\n` +
        `Devam etmek için --write ekleyin.\n`
    );
    return;
  }

  let ok = 0;
  const failed = [];

  await runPool(rows, CONCURRENCY, async (row) => {
    const remote = row.storage_path;
    const slug = row.villas?.slug;
    if (!slug) {
      failed.push({ id: row.id, reason: "villa slug'ı yok" });
      return;
    }

    try {
      const res = await fetch(remote, {
        headers: { "User-Agent": "KastayimBugunMigration/1.0" },
      });
      if (!res.ok) {
        failed.push({ id: row.id, remote, reason: `indirilemedi (${res.status})` });
        return;
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength < 1024) {
        failed.push({ id: row.id, remote, reason: "dosya çok küçük, muhtemelen hata sayfası" });
        return;
      }

      const path = storagePathFor(slug, remote, row.sort_order ?? 0);
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: res.headers.get("content-type") ?? "image/jpeg",
          upsert: true,
        });
      if (upErr) {
        failed.push({ id: row.id, remote, reason: `yüklenemedi: ${upErr.message}` });
        return;
      }

      // Satır bazında güncelle: iş yarıda kesilse bile tamamlananlar korunur
      // ve script tekrar çalıştırıldığında kalanlardan devam eder.
      const { error: updErr } = await supabase
        .from("villa_images")
        .update({ storage_path: path })
        .eq("id", row.id);
      if (updErr) {
        failed.push({ id: row.id, remote, reason: `DB güncellenemedi: ${updErr.message}` });
        return;
      }

      ok++;
    } catch (e) {
      failed.push({ id: row.id, remote, reason: e.message });
    }
  });

  console.log(`\n${"=".repeat(70)}`);
  console.log(`Taşınan: ${ok}   Başarısız: ${failed.length}`);
  if (failed.length) {
    console.log(`\n⚠ Başarısız olanlar (ilk 20):`);
    failed.slice(0, 20).forEach((f) => console.log(`  · ${f.reason} — ${f.remote ?? f.id}`));
    console.log(
      `\nScript tekrar çalıştırılabilir: başarılı olanlar atlanır, ` +
        `yalnızca kalanlar denenir.`
    );
  } else {
    console.log(`\nTüm görseller Storage'a taşındı. ✓`);
  }
  console.log(`${"=".repeat(70)}\n`);
}

main().catch((e) => {
  console.error("\nSenkron başarısız:", e);
  process.exit(1);
});
